// Individual Note API endpoints
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/leads/[id]/notes/[noteId] - Update a specific note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId, noteId } = await params
    const { note_content } = await request.json()

    if (!note_content || note_content.trim() === '') {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    // Update the note (only if user owns it)
    const { data: updatedNote, error } = await supabase
      .from('lead_notes')
      .update({
        note_content: note_content.trim()
      })
      .eq('id', noteId)
      .eq('user_id', user.id) // Only allow users to edit their own notes
      .eq('lead_id', leadId) // Ensure note belongs to the correct lead
      .select()
      .single()

    if (error) {
      console.error('Error updating note:', error)
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Notes table not created. Please run the database migration first.' 
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to update note or note not found' }, { status: 500 })
    }

    if (!updatedNote) {
      return NextResponse.json({ 
        error: 'Note not found or you do not have permission to edit this note' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      note: updatedNote,
      message: 'Note updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/leads/[id]/notes/[noteId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/notes/[noteId] - Delete a specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId, noteId } = await params

    // First, check if the note exists and who owns it
    const { data: existingNote } = await supabase
      .from('lead_notes')
      .select('id, user_id, lead_id')
      .eq('id', noteId)
      .single()

    console.log('🔍 [DELETE NOTE] Checking existing note:', { 
      existingNote, 
      requestingUserId: user.id, 
      noteId, 
      leadId 
    })

    if (!existingNote) {
      return NextResponse.json({ 
        error: 'Note not found' 
      }, { status: 404 })
    }

    if (existingNote.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only delete your own notes' 
      }, { status: 403 })
    }

    if (existingNote.lead_id !== leadId) {
      return NextResponse.json({ 
        error: 'Note does not belong to this lead' 
      }, { status: 400 })
    }

    // Now delete the note
    const { data: deletedNote, error } = await supabase
      .from('lead_notes')
      .delete()
      .eq('id', noteId)
      .select()

    console.log('🗑️ [DELETE NOTE] Delete result:', { deletedNote, error, noteId, userId: user.id, leadId })

    if (error) {
      console.error('Error deleting note:', error)
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Notes table not created. Please run the database migration first.' 
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to delete note or note not found' }, { status: 500 })
    }

    if (!deletedNote || deletedNote.length === 0) {
      return NextResponse.json({ 
        error: 'Note not found or you do not have permission to delete this note' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Note deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]/notes/[noteId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}