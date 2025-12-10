import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

// Note: Stripe instance not used in this route, just for OAuth URL generation

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

    // Check if global Stripe account is already connected
    const adminClient = createAdminClient()
    const { data: existingConfig } = await adminClient
      .from('stripe_config')
      .select('id')
      .single()

    if (existingConfig) {
      return NextResponse.json({ error: 'Stripe account already connected globally' }, { status: 400 })
    }

    // For now, return instructions for manual setup
    // This is a temporary solution until proper OAuth is configured
    return NextResponse.json({ 
      error: 'Manual Setup Required',
      message: 'Please provide your Stripe Account ID manually. Go to https://dashboard.stripe.com/settings/account and copy your Account ID (starts with acct_)',
      requiresManualSetup: true
    })
  } catch (error) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}