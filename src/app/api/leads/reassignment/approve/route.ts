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

    const { leadId, newOwnerId, notificationId } = await request.json()

    if (!leadId || !newOwnerId || !notificationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get lead info for notifications
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, company_name, assigned_to')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get new owner info
    const { data: newOwner } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', newOwnerId)
      .single()

    // Get old owner info for notification
    const { data: oldOwner } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', lead.assigned_to || '')
      .single()

    // Update the lead's assigned_to field and clear reassignment flags
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        assigned_to: newOwnerId,
        reassignment_pending: false,
        reassignment_requested_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead assignment:', updateError)
      return NextResponse.json({ error: 'Failed to update lead assignment' }, { status: 500 })
    }

    // Remove the original notification
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    // Create notification for the new owner
    const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || 'Lead'
    await createNotification(
      newOwnerId,
      'lead_reassignment_approved',
      `Lead reassignment approved`,
      `You have been assigned the lead: ${leadName}`,
      'lead',
      leadId,
      undefined,
      `/dashboard/leads?status=new`
    )

    // Create notification for the old owner (if exists)
    if (lead.assigned_to) {
      await createNotification(
        lead.assigned_to,
        'lead_reassignment_approved',
        `Lead reassignment completed`,
        `${leadName} has been reassigned to ${newOwner?.first_name} ${newOwner?.last_name}`,
        'lead',
        leadId
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lead reassignment approved successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/leads/reassignment/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}