import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const { user, isAdmin, error } = await getCurrentUser()
    
    if (error || !user || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userIds, tagIds, operation } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        error: 'User IDs array is required' 
      }, { status: 400 })
    }

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ 
        error: 'Tag IDs array is required' 
      }, { status: 400 })
    }

    if (!operation || !['add', 'remove'].includes(operation)) {
      return NextResponse.json({ 
        error: 'Operation must be "add" or "remove"' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    if (operation === 'add') {
      // Add tags to users
      const userTagPairs = []
      for (const userId of userIds) {
        for (const tagId of tagIds) {
          userTagPairs.push({
            user_id: userId,
            tag_id: tagId
          })
        }
      }

      // Insert user-tag relationships (ignore duplicates)
      const { error: insertError } = await adminClient
        .from('user_tags')
        .upsert(userTagPairs, { 
          onConflict: 'user_id,tag_id',
          ignoreDuplicates: true 
        })

      if (insertError) {
        console.error('Error adding tags to users:', insertError)
        return NextResponse.json({ 
          error: 'Failed to add tags to users' 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Successfully added ${tagIds.length} tag(s) to ${userIds.length} user(s)`
      })

    } else {
      // Remove tags from users
      const { error: deleteError } = await adminClient
        .from('user_tags')
        .delete()
        .in('user_id', userIds)
        .in('tag_id', tagIds)

      if (deleteError) {
        console.error('Error removing tags from users:', deleteError)
        return NextResponse.json({ 
          error: 'Failed to remove tags from users' 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Successfully removed ${tagIds.length} tag(s) from ${userIds.length} user(s)`
      })
    }

  } catch (error) {
    console.error('Bulk tag operation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}