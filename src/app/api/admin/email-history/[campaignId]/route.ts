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

// Check if current user is admin
async function isCurrentUserAdmin() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return profile?.role === 'admin'
  } catch {
    return false
  }
}

// GET - Fetch specific campaign details with recipients
export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { campaignId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = (page - 1) * limit
    const status = searchParams.get('status') // Filter by recipient status

    const adminClient = createAdminClient()

    // Get campaign details
    const { data: campaign, error: campaignError } = await adminClient
      .from('email_campaign_summary')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build recipients query
    let recipientsQuery = adminClient
      .from('email_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)

    // Apply status filter if provided
    if (status && ['pending', 'sent', 'failed'].includes(status)) {
      recipientsQuery = recipientsQuery.eq('status', status)
    }

    // Get total count for pagination
    let countQuery = adminClient
      .from('email_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)

    if (status && ['pending', 'sent', 'failed'].includes(status)) {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting recipients:', countError)
      return NextResponse.json({ error: 'Failed to count recipients' }, { status: 500 })
    }

    // Get recipients with pagination
    const { data: recipients, error: recipientsError } = await recipientsQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json({ error: 'Failed to fetch campaign recipients' }, { status: 500 })
    }

    // Get status breakdown
    const { data: statusBreakdown, error: statusError } = await adminClient
      .from('email_campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId)

    let statusCounts = { pending: 0, sent: 0, failed: 0 }
    if (!statusError && statusBreakdown) {
      statusCounts = statusBreakdown.reduce((acc, recipient) => {
        acc[recipient.status as keyof typeof acc]++
        return acc
      }, { pending: 0, sent: 0, failed: 0 })
    }

    return NextResponse.json({
      success: true,
      campaign,
      recipients: recipients || [],
      statusCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in campaign details API:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}