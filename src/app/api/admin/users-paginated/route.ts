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

export async function GET(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50'))) // Min 10, Max 100
    const search = searchParams.get('search')?.trim() || ''
    const role = searchParams.get('role') || ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const isDisabled = searchParams.get('disabled')
    
    const offset = (page - 1) * limit

    const adminClient = createAdminClient()

    // Step 1: Build base profiles query
    let profilesQuery = adminClient
      .from('profiles')
      .select('*', { count: 'exact' })

    // Apply search filter (search in email, first_name, last_name, nickname)
    if (search) {
      profilesQuery = profilesQuery.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,nickname.ilike.%${search}%`
      )
    }

    // Apply role filter
    if (role) {
      // Map frontend 'user' value to database 'sales' value
      const dbRole = role === 'user' ? 'sales' : role
      if (dbRole === 'admin' || dbRole === 'sales') {
        profilesQuery = profilesQuery.eq('role', dbRole)
      }
    }

    // Apply disabled filter
    if (isDisabled === 'true') {
      profilesQuery = profilesQuery.eq('is_disabled', true)
    } else if (isDisabled === 'false') {
      profilesQuery = profilesQuery.eq('is_disabled', false)
    }

    // Step 2: If tag filter is applied, get profile IDs that have those tags
    if (tags.length > 0) {
      const { data: userTagsData } = await adminClient
        .from('user_tags')
        .select('user_id')
        .in('tag_id', tags)

      const profileIdsWithTags = [...new Set(userTagsData?.map(ut => ut.user_id) || [])]
      
      if (profileIdsWithTags.length === 0) {
        // No users have the specified tags
        return NextResponse.json({
          users: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      }

      profilesQuery = profilesQuery.in('id', profileIdsWithTags)
    }

    // Step 3: Execute paginated query
    const { data: profiles, error, count } = await profilesQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching paginated users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Step 4: Fetch tags, notes count, and products for the returned profiles
    const profileIds = profiles?.map(p => p.id) || []
    const userTagsMap = new Map()
    const userNotesCountMap = new Map()
    const userProductsMap = new Map()

    if (profileIds.length > 0) {
      // Fetch tags
      const { data: userTagsData } = await adminClient
        .from('user_tags')
        .select(`
          user_id,
          tag_id,
          tags (
            id,
            name,
            color,
            description
          )
        `)
        .in('user_id', profileIds)

      // Group tags by user ID
      userTagsData?.forEach((userTag: any) => {
        if (!userTagsMap.has(userTag.user_id)) {
          userTagsMap.set(userTag.user_id, [])
        }
        userTagsMap.get(userTag.user_id).push({
          id: userTag.tag_id,
          name: userTag.tags?.name,
          color: userTag.tags?.color,
          description: userTag.tags?.description
        })
      })

      // Fetch notes count for each user
      const { data: notesCountData } = await adminClient
        .from('user_notes')
        .select('user_id')
        .in('user_id', profileIds)

      // Count notes by user ID
      notesCountData?.forEach((note: any) => {
        const currentCount = userNotesCountMap.get(note.user_id) || 0
        userNotesCountMap.set(note.user_id, currentCount + 1)
      })

      // Fetch user's active products
      const { data: userProductsData } = await adminClient
        .from('user_purchases')
        .select(`
          user_id,
          access_granted,
          access_expires_at,
          product_id,
          products (
            id,
            name,
            active
          )
        `)
        .in('user_id', profileIds)
        .eq('access_granted', true)

      // Group products by user ID and filter active products
      userProductsData?.forEach((userProduct: any) => {
        // Only include active products and check if access hasn't expired
        if (userProduct.products?.active && 
            (!userProduct.access_expires_at || new Date(userProduct.access_expires_at) > new Date())) {
          if (!userProductsMap.has(userProduct.user_id)) {
            userProductsMap.set(userProduct.user_id, [])
          }
          userProductsMap.get(userProduct.user_id).push({
            id: userProduct.product_id,
            name: userProduct.products?.name,
            access_granted: userProduct.access_granted,
            access_expires_at: userProduct.access_expires_at
          })
        }
      })
    }

    // Step 5: Format the results
    const formattedUsers = (profiles || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      created_at: profile.created_at,
      last_sign_in_at: profile.last_sign_in_at,
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        nickname: profile.nickname
      },
      profile: {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        nickname: profile.nickname,
        role: profile.role,
        is_disabled: profile.is_disabled,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      tags: userTagsMap.get(profile.id) || [],
      notes_count: userNotesCountMap.get(profile.id) || 0,
      products: userProductsMap.get(profile.id) || []
    }))

    // Step 6: Calculate pagination info
    const total = count || 0
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}