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

// GET - Fetch emails sent to a specific user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: userId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const adminClient = createAdminClient()

    // Get user profile to get email
    const { data: userProfile, error: userError } = await adminClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get email logs for this user
    const { data: emailLogs, error: logsError } = await adminClient
      .from('email_logs')
      .select(`
        *,
        sender:sent_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('recipient_email', userProfile.email)
      .range(offset, offset + limit - 1)
      .order('sent_at', { ascending: false })

    if (logsError) {
      console.error('Error fetching user email logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch user email logs' }, { status: 500 })
    }

    // Get count for pagination
    const { count, error: countError } = await adminClient
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', userProfile.email)

    if (countError) {
      console.error('Error counting user email logs:', countError)
    }

    // Get email statistics for this user
    const { data: statsData, error: statsError } = await adminClient
      .from('email_logs')
      .select('status')
      .eq('recipient_email', userProfile.email)

    let stats = { total: 0, successful: 0, failed: 0 }
    if (!statsError && statsData) {
      stats = statsData.reduce((acc, log) => {
        acc.total++
        if (log.status === 'success') acc.successful++
        else if (log.status === 'failed') acc.failed++
        return acc
      }, { total: 0, successful: 0, failed: 0 })
    }

    return NextResponse.json({
      success: true,
      user: userProfile,
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
    console.error('Error in user email logs API:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}