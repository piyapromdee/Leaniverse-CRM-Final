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

// GET - Fetch all user-tag relationships
export async function GET() {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { data: userTags, error } = await adminClient
      .from('user_tags')
      .select(`
        user_id,
        tag_id,
        tags (
          name,
          color,
          description
        )
      `)

    if (error) {
      console.error('Error fetching user tags:', error)
      return NextResponse.json({ error: 'Failed to fetch user tags' }, { status: 500 })
    }

    // Transform the data to a flatter structure
    const transformedUserTags = userTags?.map(ut => ({
      user_id: ut.user_id,
      tag_id: ut.tag_id,
      tag_name: (ut.tags as any)?.name,
      tag_color: (ut.tags as any)?.color,
      tag_description: (ut.tags as any)?.description
    })) || []

    return NextResponse.json({ userTags: transformedUserTags })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}