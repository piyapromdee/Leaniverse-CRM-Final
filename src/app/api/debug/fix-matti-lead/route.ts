// Fix the Matti lead reassignment issue specifically
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [FIX MATTI] Fixing Matti lead reassignment issue...')

    // Find the Matti lead
    const { data: mattiLead, error: findError } = await serviceClient
      .from('leads')
      .select('*')
      .or('first_name.ilike.%matti%,last_name.ilike.%matti%,company_name.ilike.%matti%')
      .single()

    if (findError || !mattiLead) {
      console.error('❌ [FIX MATTI] Could not find Matti lead:', findError)
      return NextResponse.json({ error: 'Matti lead not found' }, { status: 404 })
    }

    console.log('📋 [FIX MATTI] Found lead:', {
      id: mattiLead.id,
      name: `${mattiLead.first_name || ''} ${mattiLead.last_name || ''}`.trim() || mattiLead.company_name,
      email: mattiLead.email,
      reassignment_pending: mattiLead.reassignment_pending,
      reassignment_requested_by: mattiLead.reassignment_requested_by
    })

    // Clear the reassignment flags
    const { error: updateError } = await serviceClient
      .from('leads')
      .update({
        reassignment_pending: false,
        reassignment_requested_by: null
      })
      .eq('id', mattiLead.id)

    if (updateError) {
      console.error('❌ [FIX MATTI] Failed to update lead:', updateError)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    console.log('✅ [FIX MATTI] Successfully cleared reassignment flags')

    // Also check for any pending reassignment notifications for this lead and mark them as read
    const { data: notifications, error: notifError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('entity_id', mattiLead.id)
      .eq('type', 'lead_reassignment_request')
      .eq('is_read', false)

    if (notifications && notifications.length > 0) {
      const { error: markReadError } = await serviceClient
        .from('notifications')
        .update({ is_read: true })
        .in('id', notifications.map(n => n.id))

      console.log('📬 [FIX MATTI] Marked reassignment notifications as read:', notifications.length)
    }

    // Get updated lead info
    const { data: updatedLead } = await serviceClient
      .from('leads')
      .select('*')
      .eq('id', mattiLead.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Matti lead reassignment issue fixed',
      lead: {
        id: updatedLead?.id,
        name: `${updatedLead?.first_name || ''} ${updatedLead?.last_name || ''}`.trim() || updatedLead?.company_name,
        email: updatedLead?.email,
        reassignment_pending: updatedLead?.reassignment_pending,
        reassignment_requested_by: updatedLead?.reassignment_requested_by
      },
      notificationsCleared: notifications?.length || 0,
      instructions: [
        'Refresh the leads page',
        'The clock icon should be removed from the Matti lead',
        'The lead is now in normal state'
      ]
    })

  } catch (error) {
    console.error('Error fixing Matti lead:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}