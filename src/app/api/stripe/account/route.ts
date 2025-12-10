import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { APIErrorHandler } from '@/lib/api-error-handler'

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

export async function GET() {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get global Stripe configuration from database
    const adminClient = createAdminClient()
    const { data: stripeConfig, error } = await adminClient
      .from('stripe_config')
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No configuration found
        return NextResponse.json({ account: null }, { status: 404 })
      }
      return APIErrorHandler.handleDatabaseError('STRIPE_ACCOUNT_GET', error, { action: 'fetch_stripe_config' })
    }

    // Get fresh account data from Stripe
    try {
      const account = await stripe.accounts.retrieve(stripeConfig.stripe_account_id)
      
      // Update our database with fresh data
      const { error: updateError } = await adminClient
        .from('stripe_config')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          business_profile: account.business_profile,
          capabilities: account.capabilities,
          country: account.country,
          default_currency: account.default_currency,
        })
        .eq('id', stripeConfig.id)

      if (updateError) {
        console.error('Error updating Stripe configuration:', updateError)
      }

      // Return combined data
      return NextResponse.json({
        account: {
          ...stripeConfig,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          business_profile: account.business_profile,
          country: account.country,
          default_currency: account.default_currency,
        }
      })
    } catch (stripeError) {
      console.error('Error fetching account from Stripe:', stripeError)
      // Return database data if Stripe API fails
      return NextResponse.json({ account: stripeConfig })
    }
  } catch (error) {
    return APIErrorHandler.handleGenericError('STRIPE_ACCOUNT_GET', error)
  }
}