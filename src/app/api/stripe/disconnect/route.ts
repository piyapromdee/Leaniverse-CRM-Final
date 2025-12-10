import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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

export async function POST() {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Get the global Stripe configuration from database
    const { data: stripeConfig, error: fetchError } = await adminClient
      .from('stripe_config')
      .select('*')
      .single()

    if (fetchError || !stripeConfig) {
      return NextResponse.json({ error: 'No Stripe configuration found' }, { status: 404 })
    }

    try {
      // Deauthorize the Stripe Connect account
      await getStripe().oauth.deauthorize({
        client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
        stripe_user_id: stripeConfig.stripe_account_id,
      })
    } catch (stripeError) {
      console.error('Error deauthorizing Stripe account:', stripeError)
      // Continue with database cleanup even if Stripe deauthorization fails
    }

    // Remove from our database
    const { error: deleteError } = await adminClient
      .from('stripe_config')
      .delete()
      .eq('id', stripeConfig.id)

    if (deleteError) {
      console.error('Error deleting Stripe configuration from database:', deleteError)
      return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
    }

    // Preserve products but mark them as disconnected from Stripe
    // Clear Stripe-specific fields instead of deleting records
    await Promise.all([
      // Mark products as inactive and clear Stripe references
      adminClient.from('products').update({ 
        active: false, 
        stripe_product_id: null,
        updated_at: new Date().toISOString()
      }).neq('id', '00000000-0000-0000-0000-000000000000'),
      
      // Mark prices as inactive and clear Stripe references  
      adminClient.from('prices').update({ 
        active: false, 
        stripe_price_id: null,
        updated_at: new Date().toISOString()
      }).neq('id', '00000000-0000-0000-0000-000000000000'),
    ])

    return NextResponse.json({ success: true, message: 'Stripe account disconnected successfully' })
  } catch (error) {
    console.error('Stripe disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}