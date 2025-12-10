import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Stripe Connect OAuth error:', error, errorDescription)
    const redirectUrl = new URL('/admin/stripe', request.url)
    redirectUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code || !state) {
    const redirectUrl = new URL('/admin/stripe', request.url)
    redirectUrl.searchParams.set('error', 'Missing authorization code or state')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Extract user ID from state parameter
    const stateMatch = state.match(/^user_([^_]+)_\d+$/)
    if (!stateMatch) {
      throw new Error('Invalid state parameter')
    }
    const userId = stateMatch[1]

    // Exchange authorization code for access token
    const response = await getStripe().oauth.token({
      grant_type: 'authorization_code',
      code: code,
    })

    const {
      access_token,
      refresh_token,
      stripe_user_id,
      scope,
      stripe_publishable_key,
      livemode,
    } = response

    // Get account details from Stripe
    const account = await getStripe().accounts.retrieve(stripe_user_id!)

    // Store the global connection in our database
    const adminClient = createAdminClient()
    const { error: dbError } = await adminClient
      .from('stripe_config')
      .insert({
        stripe_account_id: stripe_user_id,
        access_token: access_token,
        refresh_token: refresh_token,
        livemode: livemode,
        scope: scope,
        stripe_publishable_key: stripe_publishable_key,
        account_type: account.type,
        country: account.country,
        default_currency: account.default_currency,
        business_profile: account.business_profile,
        capabilities: account.capabilities,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        connected_by: userId,
      })

    if (dbError) {
      console.error('Error saving Stripe account to database:', dbError)
      throw new Error('Failed to save account connection')
    }

    // Redirect back to admin panel with success message
    const redirectUrl = new URL('/admin/stripe', request.url)
    redirectUrl.searchParams.set('success', 'Stripe account connected successfully')
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Stripe Connect callback error:', error)
    const redirectUrl = new URL('/admin/stripe', request.url)
    redirectUrl.searchParams.set('error', 'Failed to connect Stripe account')
    return NextResponse.redirect(redirectUrl)
  }
}