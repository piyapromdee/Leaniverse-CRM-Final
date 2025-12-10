import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { transactionService } from '@/lib/transaction-service'
import { getStripe } from '@/lib/stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error('Missing webhook secret')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Stripe webhook received:', event.type, event.id)

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event.livemode)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, event.livemode)
        break
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, event.livemode)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, livemode: boolean) {
  try {
    console.log('Processing successful payment:', paymentIntent.id)
    console.log('Payment intent metadata:', paymentIntent.metadata)
    console.log('Payment intent customer:', paymentIntent.customer)
    console.log('Payment intent amount:', paymentIntent.amount, paymentIntent.currency)
    
    // Extract metadata
    const productId = paymentIntent.metadata.productId
    const priceId = paymentIntent.metadata.priceId
    const productName = paymentIntent.metadata.productName || 'Unknown Product'
    let customerUserId = paymentIntent.metadata.customerUserId

    // Extract customer data from multiple sources
    let customerEmail = paymentIntent.metadata.customerEmail
    let customerFirstName = paymentIntent.metadata.customerFirstName
    let customerLastName = paymentIntent.metadata.customerLastName

    // If metadata is empty, try to get from receipt_email
    if (!customerEmail && paymentIntent.receipt_email) {
      customerEmail = paymentIntent.receipt_email
    }

    // Try to get from shipping details
    if ((!customerFirstName || !customerLastName) && paymentIntent.shipping?.name) {
      const nameParts = paymentIntent.shipping.name.split(' ')
      if (nameParts.length >= 2) {
        customerFirstName = customerFirstName || nameParts[0]
        customerLastName = customerLastName || nameParts.slice(1).join(' ')
      }
    }

    // Try to get from Stripe customer if available
    if (!customerEmail && paymentIntent.customer) {
      try {
        const customer = await getStripe().customers.retrieve(paymentIntent.customer as string)
        if (customer && !customer.deleted) {
          customerEmail = customerEmail || customer.email || ''
          if (customer.name && (!customerFirstName || !customerLastName)) {
            const nameParts = customer.name.split(' ')
            if (nameParts.length >= 2) {
              customerFirstName = customerFirstName || nameParts[0]
              customerLastName = customerLastName || nameParts.slice(1).join(' ')
            }
          }
        }
      } catch (err) {
        console.error('Error retrieving Stripe customer:', err)
      }
    }

    // Get the actual payment method used (not just available types)
    let actualPaymentMethod = 'card' // default fallback
    try {
      if (paymentIntent.payment_method) {
        // Retrieve the payment method details
        const paymentMethod = await getStripe().paymentMethods.retrieve(paymentIntent.payment_method as string)
        actualPaymentMethod = paymentMethod.type
        console.log('Actual payment method used:', actualPaymentMethod)
      }
    } catch (err) {
      console.error('Error retrieving payment method:', err)
    }

    console.log('Extracted data from all sources:', {
      productId,
      priceId,
      productName,
      customerUserId,
      customerEmail,
      customerFirstName,
      customerLastName,
      actualPaymentMethod,
      paymentIntentReceiptEmail: paymentIntent.receipt_email,
      paymentIntentShipping: paymentIntent.shipping,
      paymentIntentCustomer: paymentIntent.customer
    })

    if (!productId || !priceId) {
      console.error('Missing product or price metadata in payment intent:', paymentIntent.id)
      return
    }

    // Handle guest purchase - check if user exists by email and create/link account
    let userAccountInfo = null
    if (customerEmail) {
      console.log('Processing payment with email, checking for existing user:', customerEmail)
      
      try {
        userAccountInfo = await transactionService.findOrCreateUserByEmail({
          email: customerEmail,
          firstName: customerFirstName || '',
          lastName: customerLastName || '',
          productName
        })
        
        // Use the found/created user ID for the transaction
        customerUserId = userAccountInfo.userId
        console.log('User account handled:', { 
          userId: customerUserId, 
          isNewUser: userAccountInfo.isNewUser,
          existingUserFound: !userAccountInfo.isNewUser
        })
      } catch (accountError) {
        console.error('Failed to handle user account, but continuing with transaction:', accountError)
        // Continue processing transaction even if account creation fails
      }
    } else {
      console.log('No email provided in payment, treating as anonymous transaction')
    }

    // Create transaction record
    const transaction = await transactionService.createTransaction({
      customerUserId: customerUserId || undefined,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer as string || undefined,
      productId,
      priceId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      paymentMethodTypes: [actualPaymentMethod], // Store actual payment method used
      metadata: {
        ...paymentIntent.metadata,
        // Add account creation info to transaction metadata
        userAccountCreated: userAccountInfo?.isNewUser || false,
        customerEmail: customerEmail || '',
        customerFirstName: customerFirstName || '',
        customerLastName: customerLastName || '',
        // Store both for reference
        actualPaymentMethod: actualPaymentMethod,
        availablePaymentMethods: paymentIntent.payment_method_types.join(','),
        // Store Stripe mode information
        livemode: livemode,
        stripeMode: livemode ? 'live' : 'test'
      }
    })

    // Create user purchase record if we have a customer user ID
    if (customerUserId && transaction) {
      // Get price details to calculate expiry
      const adminClient = transactionService['adminClient']
      const { data: price } = await adminClient
        .from('prices')
        .select('type, interval, interval_count')
        .eq('id', priceId)
        .single()

      const accessExpiresAt = price?.type === 'recurring' && price.interval
        ? transactionService.calculateSubscriptionExpiry(price.interval, price.interval_count || 1)
        : undefined

      await transactionService.createUserPurchase({
        userId: customerUserId,
        transactionId: transaction.id,
        productId,
        accessGranted: true,
        accessExpiresAt
      })

      console.log('User purchase created for:', customerUserId, productId)
    }

    // TODO: Send email notification with account credentials for new users
    if (userAccountInfo?.isNewUser && userAccountInfo.tempPassword) {
      console.log('New user account created - should send email with credentials')
      // Email sending functionality can be added here
    }

    console.log('Payment processing completed successfully')
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, livemode: boolean) {
  try {
    console.log('Processing failed payment:', paymentIntent.id)
    
    // Extract metadata
    const productId = paymentIntent.metadata.productId
    const priceId = paymentIntent.metadata.priceId
    const customerUserId = paymentIntent.metadata.customerUserId

    // Create transaction record for failed payment
    await transactionService.createTransaction({
      customerUserId: customerUserId || undefined,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer as string || undefined,
      productId,
      priceId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'failed',
      paymentMethodTypes: paymentIntent.payment_method_types,
      metadata: {
        ...paymentIntent.metadata,
        livemode: livemode,
        stripeMode: livemode ? 'live' : 'test'
      }
    })

    console.log('Failed payment recorded')
  } catch (error) {
    console.error('Error handling payment intent failed:', error)
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent, livemode: boolean) {
  try {
    console.log('Processing canceled payment:', paymentIntent.id)
    
    // Extract metadata
    const productId = paymentIntent.metadata.productId
    const priceId = paymentIntent.metadata.priceId
    const customerUserId = paymentIntent.metadata.customerUserId

    // Create transaction record for canceled payment
    await transactionService.createTransaction({
      customerUserId: customerUserId || undefined,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer as string || undefined,
      productId,
      priceId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'canceled',
      paymentMethodTypes: paymentIntent.payment_method_types,
      metadata: {
        ...paymentIntent.metadata,
        livemode: livemode,
        stripeMode: livemode ? 'live' : 'test'
      }
    })

    console.log('Canceled payment recorded')
  } catch (error) {
    console.error('Error handling payment intent canceled:', error)
  }
}