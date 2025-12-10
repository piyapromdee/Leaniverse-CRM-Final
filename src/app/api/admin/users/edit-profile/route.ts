import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const { userId, firstName, lastName, nickname, email, tagIds } = await request.json()

    if (!userId || !firstName || !lastName || !email) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, firstName, lastName, email' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    // Check if email is already in use by another user
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Email address is already in use by another user' 
      }, { status: 400 })
    }

    // Update the user's profile in the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname ? nickname.trim() : null,
        email: email.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ 
        error: 'Failed to update profile' 
      }, { status: 500 })
    }

    // For email changes, we also need to update the auth.users table using the admin API
    // Get current user data to check if email changed
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (currentProfile && currentProfile.email !== email.trim()) {
      // Update email in auth.users table using admin client
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          email: email.trim(),
          user_metadata: {
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      )

      if (authUpdateError) {
        console.error('Error updating auth user email:', authUpdateError)
        // Note: Profile was already updated, so we don't rollback here
        // This is acceptable as the profile update is the primary source of truth
      }
    } else {
      // Update user metadata even if email didn't change
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          user_metadata: {
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      )

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError)
        // Non-critical error, continue
      }
    }

    // Update user tags if tagIds is provided
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // First, delete all existing tags for this user
      const { error: deleteTagsError } = await supabase
        .from('user_tags')
        .delete()
        .eq('user_id', userId)

      if (deleteTagsError) {
        console.error('Error deleting existing user tags:', deleteTagsError)
        // Non-critical error, continue
      }

      // Insert new tags if any are selected
      if (tagIds.length > 0) {
        const userTagPairs = tagIds.map(tagId => ({
          user_id: userId,
          tag_id: tagId
        }))

        const { error: insertTagsError } = await supabase
          .from('user_tags')
          .insert(userTagPairs)

        if (insertTagsError) {
          console.error('Error inserting user tags:', insertTagsError)
          // Non-critical error, continue
        }
      }
    }

    return NextResponse.json({
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error in edit-profile API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}