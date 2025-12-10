import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SUPPORTED_CURRENCIES, validateCurrencyAmount } from '@/lib/currency'
import { getStripe } from '@/lib/stripe'

// Admin client with service role key
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Check if current user is admin
async function isCurrentUserAdmin() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { isAdmin: false, user: null }
    
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return { 
      isAdmin: profile?.role === 'admin', 
      user 
    }
  } catch {
    return { isAdmin: false, user: null }
  }
}

// Get Stripe account configuration
async function getStripeConfig() {
  const adminClient = createAdminClient()
  const { data: stripeConfig, error } = await adminClient
    .from('stripe_config')
    .select('*')
    .single()

  return { stripeConfig, error }
}

// PUT - Update price (creates new Stripe price since Stripe prices are immutable)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; priceId: string }> }
) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const resolvedParams = await params
    const productId = resolvedParams.id
    const priceId = resolvedParams.priceId
    const body = await request.json()
    const { unit_amount, currency, type, interval, interval_count } = body

    if (!unit_amount || !currency || !type) {
      return NextResponse.json({ 
        error: 'unit_amount, currency, and type are required' 
      }, { status: 400 })
    }

    // Validate currency
    const currencyLower = currency.toLowerCase()
    if (!SUPPORTED_CURRENCIES[currencyLower]) {
      const supportedList = Object.keys(SUPPORTED_CURRENCIES).map(c => c.toUpperCase()).join(', ')
      return NextResponse.json({ 
        error: `Unsupported currency. Supported currencies: ${supportedList}` 
      }, { status: 400 })
    }

    // Validate amount
    const amountInBaseCurrency = unit_amount / 100
    const validation = validateCurrencyAmount(amountInBaseCurrency, currencyLower)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get existing price and product
    const { data: existingPrice, error: priceError } = await adminClient
      .from('prices')
      .select(`
        *,
        products (*)
      `)
      .eq('id', priceId)
      .eq('product_id', productId)
      .single()

    if (priceError || !existingPrice) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    // Check if Stripe is configured and product is linked
    const { stripeConfig, error: stripeError } = await getStripeConfig()
    
    let newStripePrice = null
    let newStripePriceId = null

    if (!stripeError && stripeConfig && existingPrice.products.stripe_product_id) {
      // Create new price in Stripe (since Stripe prices are immutable)
      try {
        const stripePriceData: Stripe.PriceCreateParams = {
          product: existingPrice.products.stripe_product_id,
          unit_amount: unit_amount,
          currency: currencyLower,
          active: true,
        }

        if (type === 'recurring') {
          stripePriceData.recurring = {
            interval: interval || 'month',
            interval_count: interval_count || 1
          }
        }

        newStripePrice = await getStripe().prices.create(stripePriceData, {
          stripeAccount: stripeConfig.stripe_account_id
        })

        newStripePriceId = newStripePrice.id

        // Deactivate old Stripe price if it exists
        if (existingPrice.stripe_price_id) {
          try {
            await getStripe().prices.update(existingPrice.stripe_price_id, {
              active: false
            }, {
              stripeAccount: stripeConfig.stripe_account_id
            })
          } catch (deactivateError) {
            console.error('Error deactivating old Stripe price:', deactivateError)
            // Continue - not critical
          }
        }
      } catch (stripeCreateError) {
        console.error('Error creating new Stripe price:', stripeCreateError)
        // Continue without Stripe - we'll update the price as unlinked
      }
    }

    // Update price in database
    const { data: updatedPrice, error: updateError } = await adminClient
      .from('prices')
      .update({
        stripe_price_id: newStripePriceId,
        unit_amount: unit_amount,
        currency: currencyLower,
        type: type,
        interval: type === 'recurring' ? (interval || 'month') : null,
        interval_count: type === 'recurring' ? (interval_count || 1) : null,
        stripe_linked: newStripePriceId !== null,
        stripe_link_status: newStripePriceId ? 'linked' : 'unlinked',
        last_stripe_sync: new Date().toISOString()
      })
      .eq('id', priceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating price in database:', updateError)
      return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      price: updatedPrice,
      message: newStripePriceId 
        ? 'Price updated and new Stripe price created successfully' 
        : 'Price updated (not linked to Stripe - will be linked when Stripe is reconnected)'
    })
  } catch (error) {
    console.error('Update price error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Deactivate price (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; priceId: string }> }
) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const resolvedParams = await params
    const productId = resolvedParams.id
    const priceId = resolvedParams.priceId

    const adminClient = createAdminClient()

    // Get existing price
    const { data: existingPrice, error: priceError } = await adminClient
      .from('prices')
      .select('*')
      .eq('id', priceId)
      .eq('product_id', productId)
      .single()

    if (priceError || !existingPrice) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    // Check if this is the only active price for the product
    const { data: activePrices, error: activePricesError } = await adminClient
      .from('prices')
      .select('id')
      .eq('product_id', productId)
      .eq('active', true)

    if (activePricesError) {
      return NextResponse.json({ error: 'Failed to check active prices' }, { status: 500 })
    }

    if (activePrices && activePrices.length <= 1) {
      return NextResponse.json({ 
        error: 'Cannot delete the only active price. Products must have at least one active price.' 
      }, { status: 400 })
    }

    // Deactivate price in Stripe if it exists
    const { stripeConfig, error: stripeError } = await getStripeConfig()
    
    if (!stripeError && stripeConfig && existingPrice.stripe_price_id) {
      try {
        await getStripe().prices.update(existingPrice.stripe_price_id, {
          active: false
        }, {
          stripeAccount: stripeConfig.stripe_account_id
        })
      } catch (stripeDeactivateError) {
        console.error('Error deactivating Stripe price:', stripeDeactivateError)
        // Continue - we'll still deactivate in our database
      }
    }

    // Deactivate price in database (soft delete)
    const { data: deactivatedPrice, error: deactivateError } = await adminClient
      .from('prices')
      .update({
        active: false,
        last_stripe_sync: new Date().toISOString()
      })
      .eq('id', priceId)
      .select()
      .single()

    if (deactivateError) {
      console.error('Error deactivating price in database:', deactivateError)
      return NextResponse.json({ error: 'Failed to deactivate price' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      price: deactivatedPrice,
      message: 'Price deactivated successfully'
    })
  } catch (error) {
    console.error('Delete price error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}