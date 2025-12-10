// Lead Notes API endpoints
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Helper function to extract mentions from text
function extractMentionsFromText(text: string): Array<{ userId: string; username: string }> {
  const mentionPattern = /@(\w+)/g
  const mentions: Array<{ userId: string; username: string }> = []
  let match

  while ((match = mentionPattern.exec(text)) !== null) {
    const username = match[1]
    // For now, we'll use the username as userId and let the API resolve it
    // This is a simplified approach - in production you'd want to resolve usernames to IDs
    mentions.push({
      userId: username, // This will be resolved later in the API
      username: username
    })
  }

  return mentions
}

// GET /api/leads/[id]/notes - Fetch all notes for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params

    // First check if the table exists by attempting a simple query
    const { data: notes, error } = await supabase
      .from('lead_notes')
      .select(`
        id,
        lead_id,
        user_id,
        note_content,
        mentions,
        is_system_note,
        created_at,
        updated_at
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching lead notes:', error)
      // If table doesn't exist, return empty array
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('lead_notes table does not exist yet. Please run the migration.')
        return NextResponse.json({ notes: [], message: 'Notes table not yet created. Please run migration.' })
      }
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
    
    // If we have notes, fetch user profiles separately
    const notesWithProfiles = await Promise.all(
      (notes || []).map(async (note) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', note.user_id)
          .single()
        
        return {
          ...note,
          profiles: profile || { first_name: 'Unknown', last_name: 'User' }
        }
      })
    )

    return NextResponse.json({ notes: notesWithProfiles })

  } catch (error) {
    console.error('Error in GET /api/leads/[id]/notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leads/[id]/notes - Create a new note for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params
    const { note_content, is_system_note = false } = await request.json()

    if (!note_content || note_content.trim() === '') {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    // Process mentions from the note content
    const mentions = extractMentionsFromText(note_content.trim())
    
    // If we found mentions, resolve usernames to user IDs and fetch user details
    let processedMentions: any[] = []
    if (mentions.length > 0) {
      // Get unique usernames to avoid duplicate queries
      const uniqueUsernames = [...new Set(mentions.map(m => m.username))]
      
      // Search for users by first name (lowercase match)
      // We'll search for users whose first name matches the @mention
      const { data: mentionUsers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
      
      // Manually filter for case-insensitive matches
      const matchedUsers = mentionUsers?.filter(user => {
        const firstName = user.first_name?.toLowerCase()
        return uniqueUsernames.some(username => 
          firstName === username.toLowerCase()
        )
      }) || []
      
      console.log('🔍 [CREATE NOTE] Mention search - Usernames:', uniqueUsernames, 'Found users:', matchedUsers)
      
      processedMentions = mentions
        .map(mention => {
          const userProfile = matchedUsers.find(u => 
            u.first_name?.toLowerCase() === mention.username.toLowerCase()
          )
          if (!userProfile) {
            console.log(`⚠️ [CREATE NOTE] No user found for mention: @${mention.username}`)
            return null // Skip mentions that don't match any user
          }
          
          console.log(`✅ [CREATE NOTE] Found user for @${mention.username}:`, userProfile)
          return {
            user_id: userProfile.id,
            username: mention.username,
            full_name: `${userProfile.first_name} ${userProfile.last_name}`.trim()
          }
        })
        .filter(Boolean) // Remove null entries
    }

    // Insert the note with processed mentions
    const { data: note, error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        note_content: note_content.trim(),
        is_system_note,
        mentions: processedMentions
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Notes table not created. Please run the database migration first.' 
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
    
    // Fetch user profile for the created note
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single()
    
    const noteWithProfile = {
      ...note,
      profiles: profile || { first_name: 'Unknown', last_name: 'User' }
    }

    // Process mentions and send notifications
    console.log('🔔 [CREATE NOTE] Checking for mentions in created note:', note.mentions)
    if (note.mentions && Array.isArray(note.mentions) && note.mentions.length > 0) {
      console.log('🔔 [CREATE NOTE] Processing notifications for mentions:', note.mentions)
      try {
        // Get lead details for notification
        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, company_name, email')
          .eq('id', leadId)
          .single()

        const leadName = lead ? 
          `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || lead.email :
          'Unknown Lead'

        // Get author details
        const { data: author } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()

        const authorName = author ? 
          `${author.first_name} ${author.last_name}`.trim() || 'Someone' :
          'Someone'

        // Send notifications for each mentioned user
        for (const mention of note.mentions) {
          if (mention.user_id && mention.user_id !== user.id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: mention.user_id,
                type: 'system_alert', // Using system_alert temporarily until lead_mention is added to constraint
                title: 'You were mentioned in a note',
                message: `${authorName} mentioned you in a note on lead: ${leadName}`,
                entity_type: 'lead',
                entity_id: leadId,
                priority: 'medium',
                is_read: false,
                action_url: `/dashboard/leads?highlight=${leadId}`,
                metadata: {
                  leadId,
                  leadName,
                  noteId: note.id,
                  authorId: user.id,
                  authorName,
                  notePreview: note_content.length > 100 ? 
                    note_content.substring(0, 100) + '...' : 
                    note_content
                }
              })
          }
        }
      } catch (notificationError) {
        console.warn('Failed to send mention notifications:', notificationError)
        // Don't fail the note creation if notifications fail
      }
    }

    return NextResponse.json({ 
      success: true, 
      note: noteWithProfile,
      message: 'Note created successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/leads/[id]/notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

