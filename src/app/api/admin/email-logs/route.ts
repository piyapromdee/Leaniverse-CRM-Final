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

// GET - Fetch ALL email logs for technical debugging (personal + campaign emails)
export async function GET(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = (page - 1) * limit
    const status = searchParams.get('status') // Filter by status (sent/failed)
    const search = searchParams.get('search') // Search in recipient/subject
    const type = searchParams.get('type') // Filter by type: 'personal' (has sent_by) or 'system' (no sent_by)

    const adminClient = createAdminClient()

    // Build query for ALL email logs
    let query = adminClient
      .from('email_logs')
      .select(`
        id,
        recipient_email,
        recipient_name,
        subject,
        body,
        status,
        error_message,
        sent_at,
        sent_by,
        sender:sent_by (
          first_name,
          last_name,
          email
        )
      `)

    // Apply type filter
    if (type === 'personal') {
      query = query.not('sent_by', 'is', null)
    } else if (type === 'system') {
      query = query.is('sent_by', null)
    }

    // Apply status filter
    if (status && ['sent', 'failed'].includes(status)) {
      query = query.eq('status', status)
    }

    // Apply search filter
    if (search) {
      query = query.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    // Get total count for pagination
    let countQuery = adminClient
      .from('email_logs')
      .select('*', { count: 'exact', head: true })

    if (type === 'personal') {
      countQuery = countQuery.not('sent_by', 'is', null)
    } else if (type === 'system') {
      countQuery = countQuery.is('sent_by', null)
    }

    if (status && ['sent', 'failed'].includes(status)) {
      countQuery = countQuery.eq('status', status)
    }

    if (search) {
      countQuery = countQuery.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting email logs:', countError)
      // Don't fail, just set count to 0
    }

    // Get email logs with pagination
    const { data: emailLogs, error: logsError } = await query
      .range(offset, offset + limit - 1)
      .order('sent_at', { ascending: false })

    if (logsError) {
      console.error('Error fetching email logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 })
    }

    // Get stats for the dashboard
    const { data: statsData } = await adminClient
      .from('email_logs')
      .select('status')

    const stats = {
      total: statsData?.length || 0,
      sent: statsData?.filter(e => e.status === 'sent').length || 0,
      failed: statsData?.filter(e => e.status === 'failed').length || 0
    }

    return NextResponse.json({
      success: true,
      emailLogs: emailLogs || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in email logs API:', error)
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}