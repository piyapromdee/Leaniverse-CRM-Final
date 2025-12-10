import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notification-system'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    // Get the notification to find out who requested it
    const { data: notification } = await supabase
      .from('notifications')
      .select('metadata, user_id')
      .eq('id', notificationId)
      .single()

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Get lead info for the rejection notification
    const leadId = notification.metadata?.leadId
    const requestingUserId = notification.metadata?.requestingUserId || notification.user_id

    if (leadId && requestingUserId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, company_name')
        .eq('id', leadId)
        .single()

      if (lead) {
        const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || 'Lead'
        
        // Clear the reassignment flags from the lead
        await supabase
          .from('leads')
          .update({
            reassignment_pending: false,
            reassignment_requested_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)
        
        // Create notification for the requesting user about rejection
        await createNotification(
          requestingUserId,
          'lead_reassignment_rejected',
          `Lead reassignment rejected`,
          `Your request to be assigned to ${leadName} has been rejected by admin`,
          'lead',
          leadId
        )
      }
    }

    // Remove the original notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (deleteError) {
      console.error('Error deleting notification:', deleteError)
      return NextResponse.json({ error: 'Failed to remove notification' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lead reassignment rejected successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/leads/reassignment/reject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}