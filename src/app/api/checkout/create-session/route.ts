import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// Admin client for database access
function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// POST - Create checkout session for a product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, priceId, customerData } = body
    
    console.log('Checkout session creation with customer data:', {
      productId,
      priceId,
      customerData: customerData || 'No customer data provided'
    })

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    console.log('Checkout session - looking for product:', productId)

    const adminClient = createAdminClient()

    // Get product details
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select(`
        id,
        name,
        description,
        stripe_product_id
      `)
      .eq('id', productId)
      .eq('public_visible', true)
      .eq('active', true)
      .single()

    if (productError || !product) {
      console.log('Product not found:', { productError, productId })
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get prices for this product
    const { data: prices, error: pricesError } = await adminClient
      .from('prices')
      .select(`
        id,
        stripe_price_id,
        unit_amount,
        currency,
        type,
        interval,
        active
      `)
      .eq('product_id', product.id)
      .eq('active', true)

    if (pricesError || !prices || prices.length === 0) {
      console.log('No prices found:', { pricesError, productId })
      return NextResponse.json({ error: 'Product pricing not found' }, { status: 404 })
    }

    // Find the specific price if provided, otherwise use the first one
    let selectedPrice = prices[0]
    if (priceId) {
      const foundPrice = prices.find((p: any) => p.id === priceId)
      if (foundPrice) {
        selectedPrice = foundPrice
      }
    }

    // Check if we have Stripe secret key configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    // Validate selected price
    if (!selectedPrice || !selectedPrice.currency || !selectedPrice.unit_amount) {
      return NextResponse.json({ error: 'Invalid product pricing' }, { status: 400 })
    }

    // Determine payment method types based on currency
    const paymentMethodTypes = ['card']
    if (selectedPrice.currency.toLowerCase() === 'thb') {
      paymentMethodTypes.push('promptpay')
    }

    // Get current user for tracking (optional for guest checkout)
    let customerUserId = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      customerUserId = user?.id || null
    } catch (error) {
      console.log('Unable to get user for payment intent:', error)
      // Continue without user ID for guest checkout
    }

    // Create or get Stripe customer if customer data is provided
    let stripeCustomerId = null
    if (customerData?.email) {
      try {
        // First, check if customer already exists with this email
        const existingCustomers = await stripe.customers.list({
          email: customerData.email,
          limit: 1
        })

        if (existingCustomers.data.length > 0) {
          stripeCustomerId = existingCustomers.data[0].id
          console.log('Found existing Stripe customer:', stripeCustomerId)
        } else {
          // Create new Stripe customer
          const stripeCustomer = await stripe.customers.create({
            email: customerData.email,
            name: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
            metadata: {
              source: 'checkout',
              productId: product.id,
              existingUserId: customerUserId || ''
            }
          })
          stripeCustomerId = stripeCustomer.id
          console.log('Created new Stripe customer:', stripeCustomerId)
        }
      } catch (stripeCustomerError) {
        console.error('Error handling Stripe customer:', stripeCustomerError)
        // Continue without customer - payment will still work
      }
    }

    // Create payment intent
    const paymentIntentData: any = {
      amount: selectedPrice.unit_amount,
      currency: selectedPrice.currency,
      payment_method_types: paymentMethodTypes,
      metadata: {
        productId: product.id,
        priceId: selectedPrice.id,
        productName: product.name,
        customerUserId: customerUserId || '',
        // Include customer data in metadata for webhook processing
        customerEmail: customerData?.email || '',
        customerFirstName: customerData?.firstName || '',
        customerLastName: customerData?.lastName || ''
      },
      description: `Purchase: ${product.name}`
    }

    // Add customer to payment intent if we have one
    if (stripeCustomerId) {
      paymentIntentData.customer = stripeCustomerId
    }

    // Add receipt email if provided
    if (customerData?.email) {
      paymentIntentData.receipt_email = customerData.email
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    const response = {
      clientSecret: paymentIntent.client_secret,
      product: {
        id: product.id,
        name: product.name,
        description: product.description
      },
      price: {
        id: selectedPrice.id,
        amount: selectedPrice.unit_amount,
        currency: selectedPrice.currency,
        type: selectedPrice.type,
        interval: selectedPrice.interval
      }
    }

    console.log('Checkout session created successfully:', {
      productId: product.id,
      priceId: selectedPrice.id,
      amount: selectedPrice.unit_amount,
      currency: selectedPrice.currency,
      clientSecretExists: !!paymentIntent.client_secret
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}