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

// GET - Fetch all tags
export async function GET() {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { data: tags, error } = await adminClient
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    return NextResponse.json({ tags: tags || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new tag or manage user tags
export async function POST(request: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const adminClient = createAdminClient()

    // Create new tag
    if (body.action === 'create') {
      const { name, color, description } = body
      
      const { data: tag, error } = await adminClient
        .from('tags')
        .insert({ name, color: color || '#3b82f6', description })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 })
        }
        throw error
      }

      return NextResponse.json({ success: true, tag, message: 'Tag created successfully' })
    }

    // Assign tag to user
    if (body.action === 'assign') {
      const { userId, tagId } = body
      
      const { error } = await adminClient
        .from('user_tags')
        .insert({ user_id: userId, tag_id: tagId })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return NextResponse.json({ error: 'User already has this tag' }, { status: 400 })
        }
        throw error
      }

      return NextResponse.json({ success: true, message: 'Tag assigned successfully' })
    }

    // Remove tag from user
    if (body.action === 'remove') {
      const { userId, tagId } = body
      
      const { error } = await adminClient
        .from('user_tags')
        .delete()
        .eq('user_id', userId)
        .eq('tag_id', tagId)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Tag removed successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete tag
export async function DELETE(request: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { tagId } = await request.json()
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}