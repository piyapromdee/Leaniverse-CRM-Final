import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'

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

export async function GET() {
  try {
    // Check if user is admin and not disabled
    const { authorized, error } = await requireAdmin()
    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Get user statistics
    const { data: userStats } = await adminClient
      .from('profiles')
      .select('role, created_at')

    const totalUsers = userStats?.length || 0
    const adminUsers = userStats?.filter(user => user.role === 'admin').length || 0

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentSignups = userStats?.filter(user => 
      new Date(user.created_at) >= sevenDaysAgo
    ).length || 0

    // Get product statistics
    const { data: productStats } = await adminClient
      .from('products')
      .select('active')

    const totalProducts = productStats?.length || 0
    const activeProducts = productStats?.filter(product => product.active).length || 0

    // Check Stripe connection status
    const { data: stripeConfig } = await adminClient
      .from('stripe_config')
      .select('id')
      .single()

    const stripeConnected = !!stripeConfig

    // Platform status (hardcoded for now, could be dynamic based on health checks)
    const platformStatus = 'active'

    const stats = {
      totalUsers,
      adminUsers,
      totalProducts,
      activeProducts,
      stripeConnected,
      recentSignups,
      platformStatus
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}