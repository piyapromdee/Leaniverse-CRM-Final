import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// PUT - Update a specific note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: userId, noteId } = resolvedParams
    if (!userId || !noteId) {
      return NextResponse.json({ error: 'User ID and Note ID are required' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { content, attachments } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (attachments && !Array.isArray(attachments)) {
      return NextResponse.json({ error: 'Attachments must be an array' }, { status: 400 })
    }

    // Check if note exists and belongs to the current admin
    const { data: existingNote } = await supabase
      .from('user_notes')
      .select('id, admin_id')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.admin_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 })
    }

    // Update the note
    const updateData: any = {
      content: content.trim(),
      updated_at: new Date().toISOString()
    }

    if (attachments !== undefined) {
      updateData.attachments = attachments
    }

    const { data: note, error } = await supabase
      .from('user_notes')
      .update(updateData)
      .eq('id', noteId)
      .select(`
        id,
        content,
        attachments,
        created_at,
        updated_at,
        admin:profiles!user_notes_admin_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating user note:', error)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('User note update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: userId, noteId } = resolvedParams
    if (!userId || !noteId) {
      return NextResponse.json({ error: 'User ID and Note ID are required' }, { status: 400 })
    }

    // Check if note exists and belongs to the current admin
    const { data: existingNote } = await supabase
      .from('user_notes')
      .select('id, admin_id, attachments')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (existingNote.admin_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 })
    }

    // Delete associated attachments from storage
    if (existingNote.attachments && Array.isArray(existingNote.attachments)) {
      const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      for (const attachment of existingNote.attachments) {
        if (attachment.path) {
          try {
            await adminClient.storage
              .from('user-notes-attachments')
              .remove([attachment.path])
          } catch (storageError) {
            console.warn('Failed to delete attachment:', attachment.path, storageError)
            // Continue with note deletion even if attachment deletion fails
          }
        }
      }
    }

    // Delete the note
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('Error deleting user note:', error)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('User note deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}