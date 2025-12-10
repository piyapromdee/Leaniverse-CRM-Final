import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// POST - Update payment intent with customer data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentIntentId, customerData } = body

    if (!paymentIntentId || !customerData?.email) {
      return NextResponse.json({ 
        error: 'Payment intent ID and customer email are required' 
      }, { status: 400 })
    }

    // Get the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (!paymentIntent) {
      return NextResponse.json({ 
        error: 'Payment intent not found' 
      }, { status: 404 })
    }

    // Create or get Stripe customer
    let stripeCustomerId = null
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
            source: 'checkout_update',
            productId: paymentIntent.metadata.productId || '',
            existingUserId: paymentIntent.metadata.customerUserId || ''
          }
        })
        stripeCustomerId = stripeCustomer.id
        console.log('Created new Stripe customer:', stripeCustomerId)
      }
    } catch (stripeCustomerError) {
      console.error('Error handling Stripe customer:', stripeCustomerError)
      // Continue without customer - payment will still work
    }

    // Update payment intent with customer data
    const updateData: any = {
      metadata: {
        ...paymentIntent.metadata,
        customerEmail: customerData.email,
        customerFirstName: customerData.firstName || '',
        customerLastName: customerData.lastName || ''
      },
      receipt_email: customerData.email
    }

    // Add customer to payment intent if we have one
    if (stripeCustomerId) {
      updateData.customer = stripeCustomerId
    }

    const updatedPaymentIntent = await stripe.paymentIntents.update(
      paymentIntentId,
      updateData
    )

    console.log('Payment intent updated with customer data:', {
      paymentIntentId,
      customerId: stripeCustomerId,
      email: customerData.email
    })

    return NextResponse.json({ 
      success: true,
      customerId: stripeCustomerId,
      message: 'Customer data updated successfully'
    })
  } catch (error) {
    console.error('Update customer data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}