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

// GET - Fetch personal (one-on-one) email history
export async function GET(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const adminClient = createAdminClient()

    // Build query for personal emails (emails with sent_by, not campaign emails)
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
      .not('sent_by', 'is', null) // Only personal emails (sent by a user)

    // Apply filters
    if (status && ['sent', 'failed'].includes(status)) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`recipient_email.ilike.%${search}%,recipient_name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    // Get total count for pagination
    let countQuery = adminClient
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .not('sent_by', 'is', null)

    if (status && ['sent', 'failed'].includes(status)) {
      countQuery = countQuery.eq('status', status)
    }

    if (search) {
      countQuery = countQuery.or(`recipient_email.ilike.%${search}%,recipient_name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting emails:', countError)
      // Don't fail, just return 0
    }

    // Get emails with pagination
    const { data: emails, error: emailsError } = await query
      .range(offset, offset + limit - 1)
      .order('sent_at', { ascending: false })

    if (emailsError) {
      console.error('Error fetching personal emails:', emailsError)
      return NextResponse.json({ error: 'Failed to fetch email history' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      emails: emails || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in personal email history API:', error)
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}
