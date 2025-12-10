// User Search API for @mentions
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/search?q=query - Search users for mentions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] })
    }

    const searchTerm = query.trim().toLowerCase()

    // Search users by first name, last name
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        avatar_url
      `)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
      .limit(10)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Transform the data for frontend consumption (simplified without email)
    const transformedUsers = users?.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name} ${user.last_name}`.trim(),
      email: '', // We'll omit email for now to simplify
      role: user.role,
      avatar_url: user.avatar_url,
      // Create a mention key based on first name
      mention_key: user.first_name?.toLowerCase() || 'user'
    })) || []

    return NextResponse.json({ users: transformedUsers })

  } catch (error) {
    console.error('Error in GET /api/users/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}