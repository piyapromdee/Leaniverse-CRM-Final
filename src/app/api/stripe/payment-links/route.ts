import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

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

  if (error || !stripeConfig) {
    throw new Error('No Stripe account connected')
  }

  return stripeConfig
}

// POST - Generate payment link for a price
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin } = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get Stripe configuration
    const stripeConfig = await getStripeConfig()

    // Parse request body
    const body = await request.json()
    const { priceId } = body

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get price details from database
    const { data: price, error: priceError } = await adminClient
      .from('prices')
      .select(`
        *,
        products (*)
      `)
      .eq('id', priceId)
      .single()

    if (priceError || !price) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    // Create payment link in Stripe with QR payment support
    const paymentLinkData: any = {
      line_items: [
        {
          price: price.stripe_price_id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you for purchasing ${price.products.name}! You will receive access shortly.`
        }
      },
      allow_promotion_codes: true
      // No address collection required - simplest checkout experience
      // billing_address_collection: 'auto', // Optional: 'auto', 'required', or omit entirely
      // shipping_address_collection: { ... } // Removed for digital products
    }

    // Add payment method types based on currency and price type
    if (price.currency.toLowerCase() === 'thb') {
      if (price.type === 'recurring') {
        // PromptPay doesn't support recurring payments
        paymentLinkData.payment_method_types = ['card']
      } else {
        // One-time payments can use PromptPay
        paymentLinkData.payment_method_types = [
          'card',
          'promptpay'  // Thai QR payment method
        ]
      }
    } else if (price.currency.toLowerCase() === 'cny') {
      if (price.type === 'recurring') {
        // Some payment methods may not support recurring
        paymentLinkData.payment_method_types = ['card']
      } else {
        paymentLinkData.payment_method_types = [
          'card',
          'alipay',      // QR code payment (China)
          'wechat_pay'   // QR code payment (China)
        ]
      }
    } else {
      // For other currencies, use card as default (most widely supported)
      paymentLinkData.payment_method_types = ['card']
      
      // Add regional payment methods for one-time payments only
      if (price.type === 'one_time') {
        const currency = price.currency.toLowerCase()
        
        // European SEPA
        if (['eur', 'gbp'].includes(currency)) {
          paymentLinkData.payment_method_types.push('sepa_debit')
        }
        
        // US ACH
        if (currency === 'usd') {
          paymentLinkData.payment_method_types.push('us_bank_account')
        }
      }
    }

    const paymentLink = await stripe.paymentLinks.create(paymentLinkData, {
      stripeAccount: stripeConfig.stripe_account_id
    })

    return NextResponse.json({ 
      success: true, 
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.url,
        active: paymentLink.active
      }
    })
  } catch (error) {
    console.error('Payment link creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}