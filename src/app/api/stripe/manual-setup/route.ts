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

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { accountId } = body

    if (!accountId || !accountId.startsWith('acct_')) {
      return NextResponse.json({ error: 'Invalid account ID. Must start with acct_' }, { status: 400 })
    }

    // Check if account already exists
    const adminClient = createAdminClient()
    const { data: existingConfig } = await adminClient
      .from('stripe_config')
      .select('id')
      .single()

    if (existingConfig) {
      return NextResponse.json({ error: 'Stripe account already connected globally' }, { status: 400 })
    }

    // Verify the account exists and get details from Stripe
    try {
      const account = await stripe.accounts.retrieve(accountId)
      
      // Store the connection in our database
      const { error: dbError } = await adminClient
        .from('stripe_config')
        .insert({
          stripe_account_id: accountId,
          access_token: 'manual_setup', // Placeholder since we're not using OAuth
          livemode: !accountId.includes('test'),
          account_type: account.type,
          country: account.country,
          default_currency: account.default_currency,
          business_profile: account.business_profile,
          capabilities: account.capabilities,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          connected_by: user.id,
        })

      if (dbError) {
        console.error('Error saving Stripe account to database:', dbError)
        return NextResponse.json({ error: 'Failed to save account connection' }, { status: 500 })
      }

      // Reactivate products that were previously disabled due to Stripe disconnection
      try {
        const { data: reactivatedProducts } = await adminClient
          .from('products')
          .update({ 
            active: true, 
            updated_at: new Date().toISOString()
          })
          .eq('active', false)
          .is('stripe_product_id', null) // Products that were disconnected (had their stripe_product_id cleared)
          .select('id, name')

        const { data: reactivatedPrices } = await adminClient
          .from('prices')
          .update({ 
            active: true, 
            updated_at: new Date().toISOString()
          })
          .eq('active', false)
          .is('stripe_price_id', null) // Prices that were disconnected
          .select('id')

        console.log('Reactivated products:', reactivatedProducts?.length || 0)
        console.log('Reactivated prices:', reactivatedPrices?.length || 0)
      } catch (reactivationError) {
        console.error('Error reactivating products:', reactivationError)
        // Don't fail the connection if reactivation fails
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Stripe account connected successfully. Previously disabled products have been reactivated.',
        account: {
          id: account.id,
          country: account.country,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled
        }
      })
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe account:', stripeError)
      return NextResponse.json({ 
        error: stripeError.message || 'Invalid Stripe account ID' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Manual setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}