import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
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

  if (error || !stripeConfig) {
    throw new Error('No Stripe account connected')
  }

  return stripeConfig
}

// GET - Fetch all products
export async function GET() {
  try {
    // Check if user is admin
    const { isAdmin } = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Fetch products with their prices
    const { data: products, error } = await adminClient
      .from('products')
      .select(`
        *,
        prices (*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get Stripe configuration
    const stripeConfig = await getStripeConfig()

    // Parse request body
    const body = await request.json()
    const { name, description, short_description, features, images, public_visible, price } = body

    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
    }

    if (typeof price.unit_amount !== 'number' || price.unit_amount <= 0) {
      return NextResponse.json({ error: 'Invalid price amount' }, { status: 400 })
    }

    // Validate supported currencies
    const currency = (price.currency || 'usd').toLowerCase()
    
    if (!SUPPORTED_CURRENCIES[currency]) {
      const supportedList = Object.keys(SUPPORTED_CURRENCIES).map(c => c.toUpperCase()).join(', ')
      return NextResponse.json({ 
        error: `Unsupported currency. Supported currencies: ${supportedList}` 
      }, { status: 400 })
    }

    // Validate minimum amount for the currency
    const amountInBaseCurrency = currency === 'thb' ? price.unit_amount / 100 : price.unit_amount / 100
    const validation = validateCurrencyAmount(amountInBaseCurrency, currency)
    
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Create product in Stripe
    const stripeProduct = await getStripe().products.create({
      name,
      description: description || undefined,
      images: images && images.length > 0 ? images : undefined,
      active: true,
    }, {
      stripeAccount: stripeConfig.stripe_account_id
    })

    // Create price in Stripe
    const stripePriceData: Stripe.PriceCreateParams = {
      product: stripeProduct.id,
      unit_amount: price.unit_amount,
      currency: currency,
      active: true,
    }

    if (price.type === 'recurring') {
      stripePriceData.recurring = {
        interval: price.interval || 'month',
        interval_count: 1
      }
    }

    const stripePrice = await getStripe().prices.create(stripePriceData, {
      stripeAccount: stripeConfig.stripe_account_id
    })

    // Store in our database
    const adminClient = createAdminClient()

    // Generate slug from product name
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }

    // Insert product
    const { data: dbProduct, error: productError } = await adminClient
      .from('products')
      .insert({
        stripe_product_id: stripeProduct.id,
        name: stripeProduct.name,
        description: stripeProduct.description,
        short_description: short_description || null,
        slug: generateSlug(stripeProduct.name),
        features: features || [],
        images: stripeProduct.images || [],
        metadata: stripeProduct.metadata || {},
        active: stripeProduct.active,
        public_visible: public_visible || false,
        admin_user_id: user.id,
      })
      .select()
      .single()

    if (productError) {
      console.error('Error saving product to database:', productError)
      return NextResponse.json({ error: 'Failed to save product' }, { status: 500 })
    }

    // Insert price
    const { error: priceError } = await adminClient
      .from('prices')
      .insert({
        product_id: dbProduct.id,
        stripe_price_id: stripePrice.id,
        unit_amount: stripePrice.unit_amount || 0,
        currency: stripePrice.currency,
        type: stripePrice.type === 'recurring' ? 'recurring' : 'one_time',
        interval: stripePrice.recurring?.interval || null,
        interval_count: stripePrice.recurring?.interval_count || null,
        active: stripePrice.active,
      })

    if (priceError) {
      console.error('Error saving price to database:', priceError)
      return NextResponse.json({ error: 'Failed to save price' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      product: dbProduct,
      message: 'Product created successfully' 
    })
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}