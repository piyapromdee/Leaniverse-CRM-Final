import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
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

// POST - Link single product to Stripe
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { productId, stripeProductId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Get Stripe configuration
    const { stripeConfig, error: stripeError } = await getStripeConfig()
    if (stripeError || !stripeConfig) {
      return NextResponse.json({ 
        error: 'No Stripe account connected. Please connect Stripe first.' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get product
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

    if (product.stripe_linked && product.stripe_product_id) {
      return NextResponse.json({ 
        error: 'Product is already linked to Stripe' 
      }, { status: 400 })
    }

    let stripeProduct

    if (stripeProductId) {
      // Link to existing Stripe product
      try {
        stripeProduct = await getStripe().products.retrieve(stripeProductId, {
          stripeAccount: stripeConfig.stripe_account_id
        })
      } catch (stripeRetrieveError) {
        return NextResponse.json({ 
          error: 'Invalid Stripe product ID or product not found in Stripe' 
        }, { status: 400 })
      }
    } else {
      // Create new Stripe product
      try {
        stripeProduct = await getStripe().products.create({
          name: product.name,
          description: product.description || undefined,
          active: product.active,
        }, {
          stripeAccount: stripeConfig.stripe_account_id
        })
      } catch (stripeCreateError) {
        console.error('Error creating Stripe product:', stripeCreateError)
        return NextResponse.json({ 
          error: 'Failed to create product in Stripe' 
        }, { status: 500 })
      }
    }

    // Update product in database
    const { data: updatedProduct, error: updateProductError } = await adminClient
      .from('products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_linked: true,
        stripe_link_status: 'linked',
        last_stripe_sync: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (updateProductError) {
      console.error('Error updating product:', updateProductError)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    // Link existing prices to Stripe
    const priceResults = []
    for (const price of product.prices) {
      if (price.stripe_linked) continue // Skip already linked prices

      try {
        const stripePriceData: Stripe.PriceCreateParams = {
          product: stripeProduct.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          active: price.active,
        }

        if (price.type === 'recurring') {
          stripePriceData.recurring = {
            interval: price.interval || 'month',
            interval_count: price.interval_count || 1
          }
        }

        const stripePrice = await getStripe().prices.create(stripePriceData, {
          stripeAccount: stripeConfig.stripe_account_id
        })

        // Update price in database
        const { data: updatedPrice, error: updatePriceError } = await adminClient
          .from('prices')
          .update({
            stripe_price_id: stripePrice.id,
            stripe_linked: true,
            stripe_link_status: 'linked',
            last_stripe_sync: new Date().toISOString()
          })
          .eq('id', price.id)
          .select()
          .single()

        if (updatePriceError) {
          console.error('Error updating price:', updatePriceError)
          priceResults.push({
            priceId: price.id,
            success: false,
            error: 'Failed to update price in database'
          })
        } else {
          priceResults.push({
            priceId: price.id,
            success: true,
            stripePriceId: stripePrice.id
          })
        }
      } catch (stripePriceError) {
        console.error('Error creating Stripe price:', stripePriceError)
        priceResults.push({
          priceId: price.id,
          success: false,
          error: 'Failed to create price in Stripe'
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct,
      stripeProductId: stripeProduct.id,
      priceResults: priceResults,
      message: `Product linked to Stripe successfully. ${priceResults.filter(r => r.success).length} of ${priceResults.length} prices linked.`
    })
  } catch (error) {
    console.error('Link product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}