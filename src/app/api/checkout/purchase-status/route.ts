import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// GET - Check purchase status and account creation info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const url = new URL(request.url)
    const productId = url.searchParams.get('productId')
    const paymentIntentId = url.searchParams.get('paymentIntentId')

    // If no product ID but we have payment intent, try to find it from transaction
    if (!productId && paymentIntentId) {
      const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: transaction, error: transactionError } = await adminClient
        .from('transactions')
        .select(`
          id,
          metadata, 
          customer_user_id, 
          status, 
          product_id,
          amount,
          currency,
          payment_method_types,
          created_at,
          product:products(id, name, description, short_description, images),
          price:prices(id, type, interval, interval_count)
        `)
        .eq('stripe_payment_intent_id', paymentIntentId)
        .eq('status', 'succeeded')
        .single()

      if (transactionError || !transaction) {
        return NextResponse.json({ 
          hasPurchased: false,
          isNewUser: false,
          needsLogin: false,
          error: 'Transaction not found'
        })
      }

      const metadata = transaction.metadata || {}
      return NextResponse.json({
        hasPurchased: true,
        isNewUser: metadata.userAccountCreated === true,
        needsLogin: !!transaction.customer_user_id,
        customerEmail: metadata.customerEmail || null,
        userAccountId: transaction.customer_user_id,
        productId: transaction.product_id,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          paymentMethodTypes: transaction.payment_method_types,
          createdAt: transaction.created_at,
          status: transaction.status
        },
        product: transaction.product,
        price: transaction.price
      })
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // For guest users, try to find transaction by payment intent ID
    if (!user && paymentIntentId) {
      const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: transaction, error: transactionError } = await adminClient
        .from('transactions')
        .select(`
          id,
          metadata, 
          customer_user_id, 
          status, 
          product_id,
          amount,
          currency,
          payment_method_types,
          created_at,
          product:products(id, name, description, short_description, images),
          price:prices(id, type, interval, interval_count)
        `)
        .eq('stripe_payment_intent_id', paymentIntentId)
        .eq('status', 'succeeded')
        .single()

      if (transactionError || !transaction) {
        return NextResponse.json({ 
          hasPurchased: false,
          isNewUser: false,
          needsLogin: false
        })
      }

      const metadata = transaction.metadata || {}
      return NextResponse.json({
        hasPurchased: true,
        isNewUser: metadata.userAccountCreated === true,
        needsLogin: !!transaction.customer_user_id,
        customerEmail: metadata.customerEmail || null,
        userAccountId: transaction.customer_user_id,
        productId: transaction.product_id,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          paymentMethodTypes: transaction.payment_method_types,
          createdAt: transaction.created_at,
          status: transaction.status
        },
        product: transaction.product,
        price: transaction.price
      })
    }

    if (!user) {
      return NextResponse.json({ 
        hasPurchased: false,
        isNewUser: false,
        needsLogin: false
      })
    }

    // Check if authenticated user has purchased the product and get product/transaction details
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: purchase, error: purchaseError } = await adminClient
      .from('user_purchases')
      .select(`
        access_granted, 
        access_expires_at, 
        created_at,
        transaction:transactions(
          id,
          amount,
          currency,
          payment_method_types,
          created_at,
          status,
          price_id
        )
      `)
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('access_granted', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ 
        hasPurchased: false,
        isNewUser: false,
        needsLogin: false
      })
    }

    // Get product details
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('id, name, description, short_description, images')
      .eq('id', productId)
      .single()

    // Get price details from the transaction
    let price = null
    const transaction = Array.isArray(purchase.transaction) ? purchase.transaction[0] : purchase.transaction
    if (transaction && transaction.price_id) {
      const { data: priceData } = await adminClient
        .from('prices')
        .select('id, type, interval, interval_count')
        .eq('id', transaction.price_id)
        .single()
      price = priceData
    }

    // Check if access has expired for recurring products
    let hasValidAccess = true
    if (purchase.access_expires_at) {
      const expiryDate = new Date(purchase.access_expires_at)
      hasValidAccess = new Date() <= expiryDate
    }

    // Check if this is a recent purchase (within last hour) to show account creation status
    const isRecentPurchase = (new Date().getTime() - new Date(purchase.created_at).getTime()) < 60 * 60 * 1000

    // If we don't have transaction details from user_purchases, try to get the most recent transaction directly
    let transactionDetails = null
    if (transaction) {
      transactionDetails = {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethodTypes: transaction.payment_method_types,
        createdAt: transaction.created_at,
        status: transaction.status
      }
    } else {
      // Fallback: get most recent successful transaction for this user and product
      const { data: recentTransaction } = await adminClient
        .from('transactions')
        .select('id, amount, currency, payment_method_types, created_at, status, price_id')
        .eq('customer_user_id', user.id)
        .eq('product_id', productId)
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (recentTransaction) {
        transactionDetails = {
          id: recentTransaction.id,
          amount: recentTransaction.amount,
          currency: recentTransaction.currency,
          paymentMethodTypes: recentTransaction.payment_method_types,
          createdAt: recentTransaction.created_at,
          status: recentTransaction.status
        }

        // Also get price details from this transaction
        if (recentTransaction.price_id && !price) {
          const { data: priceData } = await adminClient
            .from('prices')
            .select('id, type, interval, interval_count')
            .eq('id', recentTransaction.price_id)
            .single()
          price = priceData
        }
      }
    }

    return NextResponse.json({
      hasPurchased: hasValidAccess,
      isNewUser: false, // If user is logged in, they have an existing account
      needsLogin: false,
      productId,
      userId: user.id,
      isRecentPurchase,
      transaction: transactionDetails,
      product: product || null,
      price: price || null
    })
  } catch (error) {
    console.error('Purchase status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}