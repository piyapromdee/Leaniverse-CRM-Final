// Clear the reassignment status for Matti lead directly
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [CLEAR MATTI] Clearing reassignment status for Matti lead...')

    // Find all leads with "Matti" in the name
    const { data: leads, error: findError } = await serviceClient
      .from('leads')
      .select('*')
      .or('first_name.ilike.%matti%,last_name.ilike.%matti%,company_name.ilike.%matti%')

    if (findError) {
      console.error('❌ [CLEAR MATTI] Error finding leads:', findError)
      return NextResponse.json({ error: 'Failed to find leads' }, { status: 500 })
    }

    console.log('📋 [CLEAR MATTI] Found leads with "Matti":', leads?.length || 0)

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No Matti lead found' }, { status: 404 })
    }

    // Update all Matti leads to clear reassignment flags
    const updateResults = []
    for (const lead of leads) {
      console.log('🔧 [CLEAR MATTI] Processing lead:', {
        id: lead.id,
        name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name,
        email: lead.email,
        current_assigned_to: lead.assigned_to,
        reassignment_status: lead.reassignment_status
      })

      // The piyapromdee ID that should be assigned after approval
      const PIYAPROMDEE_ID = '1b0bfda8-d888-4ceb-8170-5cfc156f3277'
      
      // Clear the reassignment_status (this is the actual column that exists)
      const updateData: any = {
        reassignment_status: null, // Clear any reassignment status
        assigned_to: PIYAPROMDEE_ID, // Force assignment to piyapromdee as per admin approval
        updated_at: new Date().toISOString()
      }

      console.log('✅ [CLEAR MATTI] Clearing reassignment_status and assigning to piyapromdee')

      const { error: updateError } = await serviceClient
        .from('leads')
        .update(updateData)
        .eq('id', lead.id)

      updateResults.push({
        id: lead.id,
        name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name,
        success: !updateError,
        error: updateError?.message || null,
        fieldsUpdated: Object.keys(updateData)
      })

      if (updateError) {
        console.error('❌ [CLEAR MATTI] Failed to update lead:', updateError)
      } else {
        console.log('✅ [CLEAR MATTI] Successfully updated lead')
      }
    }

    // Clean up any lingering reassignment notifications for these leads
    const leadIds = leads.map(l => l.id)
    const { data: notifications, error: notifError } = await serviceClient
      .from('notifications')
      .select('*')
      .in('entity_id', leadIds)
      .eq('type', 'lead_reassignment_request')
      .eq('is_read', false)

    if (notifications && notifications.length > 0) {
      await serviceClient
        .from('notifications')
        .delete()
        .in('id', notifications.map(n => n.id))
      
      console.log('🗑️ [CLEAR MATTI] Cleaned up reassignment notifications:', notifications.length)
    }

    // Get updated lead status
    const { data: updatedLeads } = await serviceClient
      .from('leads')
      .select('*')
      .in('id', leadIds)

    return NextResponse.json({
      success: true,
      message: 'Matti lead reassignment status cleared',
      results: {
        leadsFound: leads.length,
        updateResults,
        notificationsCleared: notifications?.length || 0,
        currentStatus: updatedLeads?.map(l => ({
          id: l.id,
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.company_name,
          assigned_to: l.assigned_to,
          reassignment_status: l.reassignment_status
        })) || []
      },
      instructions: [
        'Refresh the leads page',
        'The clock icon should now be removed from the Matti lead',
        'The lead should show as assigned to Janjarat Piyapromdee'
      ]
    })

  } catch (error) {
    console.error('Error clearing Matti reassignment:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}