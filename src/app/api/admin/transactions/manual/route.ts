import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/transaction-service'
import { requireAdmin } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'

interface ManualTransactionRequest {
  userId: string
  productId: string
  priceId: string
  status: 'succeeded' | 'failed' | 'canceled'
  notes?: string
}

// POST - Create manual transaction (admin only)
export async function POST(request: NextRequest) {
  try {
    const { authorized, error, user } = await requireAdmin()
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 })
    }

    const adminUserId = user?.id

    const body: ManualTransactionRequest = await request.json()
    const { userId, productId, priceId, status, notes } = body

    // Validate required fields
    if (!userId || !productId || !priceId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, productId, priceId, status' 
      }, { status: 400 })
    }

    // Validate status
    if (!['succeeded', 'failed', 'canceled'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be one of: succeeded, failed, canceled' 
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify product exists and get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, active')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.active) {
      return NextResponse.json({ error: 'Product is not active' }, { status: 400 })
    }

    // Verify price exists and belongs to the product
    const { data: price, error: priceError } = await supabase
      .from('prices')
      .select('id, product_id, unit_amount, currency, type, interval, interval_count, active')
      .eq('id', priceId)
      .eq('product_id', productId)
      .single()

    if (priceError || !price) {
      return NextResponse.json({ 
        error: 'Price not found or does not belong to the specified product' 
      }, { status: 404 })
    }

    if (!price.active) {
      return NextResponse.json({ error: 'Price is not active' }, { status: 400 })
    }

    // Check if user already has access to this product (for succeeded transactions only)
    if (status === 'succeeded') {
      const hasAccess = await transactionService.hasUserPurchasedProduct(userId, productId)
      if (hasAccess) {
        return NextResponse.json({ 
          error: 'User already has access to this product' 
        }, { status: 400 })
      }
    }

    // Generate unique manual payment intent ID
    const manualPaymentIntentId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create transaction with manual metadata
    const transactionData = {
      customerUserId: userId,
      stripePaymentIntentId: manualPaymentIntentId,
      productId,
      priceId,
      amount: price.unit_amount,
      currency: price.currency,
      status,
      paymentMethodTypes: ['manual'],
      metadata: {
        manual_transaction: true,
        created_by_admin: adminUserId,
        admin_notes: notes || '',
        user_email: targetUser.email,
        user_name: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim(),
        product_name: product.name,
        price_type: price.type,
        manual_created_at: new Date().toISOString()
      }
    }

    // Create the transaction
    const transaction = await transactionService.createTransaction(transactionData)

    if (!transaction) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // Create user purchase if transaction succeeded
    let userPurchase = null
    if (status === 'succeeded') {
      // Calculate expiration for recurring products
      const accessExpiresAt = price.type === 'recurring' && price.interval
        ? transactionService.calculateSubscriptionExpiry(price.interval, price.interval_count || 1)
        : undefined

      userPurchase = await transactionService.createUserPurchase({
        userId,
        transactionId: transaction.id,
        productId,
        accessGranted: true,
        accessExpiresAt
      })
    }

    return NextResponse.json({ 
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        created_at: transaction.created_at,
        manual: true,
        user_name: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.email
      },
      userPurchase: userPurchase ? {
        id: userPurchase.id,
        access_granted: userPurchase.access_granted,
        access_expires_at: userPurchase.access_expires_at
      } : null,
      message: status === 'succeeded' 
        ? `Manual transaction created successfully. User ${targetUser.email} now has access to ${product.name}.`
        : `Manual transaction created with status: ${status}.`
    })

  } catch (error) {
    console.error('Manual transaction creation error:', error)
    return NextResponse.json({ error: 'Failed to create manual transaction' }, { status: 500 })
  }
}

// GET - Get products and prices for manual transaction creation
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin()
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Fetch active products with their prices
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        short_description,
        active,
        prices:prices(
          id,
          unit_amount,
          currency,
          type,
          interval,
          interval_count,
          active
        )
      `)
      .eq('active', true)
      .order('name')

    if (productsError) {
      console.error('Error fetching products for manual transaction:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Filter to only include products with active prices
    const productsWithPrices = products?.filter(product => 
      product.prices && product.prices.some((price: any) => price.active)
    ).map(product => ({
      ...product,
      prices: product.prices.filter((price: any) => price.active)
    })) || []

    return NextResponse.json({ products: productsWithPrices })

  } catch (error) {
    console.error('Get products for manual transaction error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}