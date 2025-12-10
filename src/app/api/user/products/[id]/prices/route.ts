import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SUPPORTED_CURRENCIES, validateCurrencyAmount, convertToStripeAmount } from '@/lib/currency'
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

// GET - List all prices for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const { isAdmin } = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const resolvedParams = await params
    const productId = resolvedParams.id
    const adminClient = createAdminClient()

    // Fetch product with prices
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select(`
        *,
        prices (*)
      `)
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      product: product,
      prices: product.prices || []
    })
  } catch (error) {
    console.error('Get prices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new price to product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const resolvedParams = await params
    const productId = resolvedParams.id
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

    // Check if product exists
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if Stripe is configured and product is linked
    const { stripeConfig, error: stripeError } = await getStripeConfig()
    
    let stripePrice = null
    let stripePriceId = null

    if (!stripeError && stripeConfig && product.stripe_product_id) {
      // Create price in Stripe if possible
      try {
        const stripePriceData: Stripe.PriceCreateParams = {
          product: product.stripe_product_id,
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

        stripePrice = await getStripe().prices.create(stripePriceData, {
          stripeAccount: stripeConfig.stripe_account_id
        })

        stripePriceId = stripePrice.id
      } catch (stripeCreateError) {
        console.error('Error creating Stripe price:', stripeCreateError)
        // Continue without Stripe - we'll create the price as unlinked
      }
    }

    // Insert price into database
    const { data: dbPrice, error: priceError } = await adminClient
      .from('prices')
      .insert({
        product_id: productId,
        stripe_price_id: stripePriceId,
        unit_amount: unit_amount,
        currency: currencyLower,
        type: type,
        interval: type === 'recurring' ? (interval || 'month') : null,
        interval_count: type === 'recurring' ? (interval_count || 1) : null,
        active: true,
        stripe_linked: stripePriceId !== null,
        stripe_link_status: stripePriceId ? 'linked' : 'unlinked'
      })
      .select()
      .single()

    if (priceError) {
      console.error('Error saving price to database:', priceError)
      return NextResponse.json({ error: 'Failed to save price' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      price: dbPrice,
      message: stripePriceId 
        ? 'Price created and linked to Stripe successfully' 
        : 'Price created (not linked to Stripe - will be linked when Stripe is reconnected)'
    })
  } catch (error) {
    console.error('Add price error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}