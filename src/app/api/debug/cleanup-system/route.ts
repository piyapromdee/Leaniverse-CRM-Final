// Clean up test notifications and fix reassignment issues
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🧹 [CLEANUP] Starting system cleanup...')

    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'
    const ADMIN_USER_ID = '1b0bfda8-d888-4ceb-8170-5cfc156f3277'

    // Step 1: Clear all TEST notifications for Sales J
    const { data: testNotifications, error: fetchError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)
      .or('title.ilike.%TEST%,message.ilike.%test%,title.eq.Visibility Test Notification')

    console.log('📬 [CLEANUP] Found test notifications:', testNotifications?.length || 0)

    if (testNotifications && testNotifications.length > 0) {
      const { error: deleteError } = await serviceClient
        .from('notifications')
        .delete()
        .in('id', testNotifications.map(n => n.id))

      console.log('🗑️ [CLEANUP] Deleted test notifications:', deleteError ? 'failed' : 'success')
    }

    // Step 2: Clear any reassignment_pending flags from leads that don't have active requests
    // First, get all leads with reassignment_pending flag
    const { data: pendingLeads, error: pendingError } = await serviceClient
      .from('leads')
      .select('id, first_name, last_name, email, reassignment_pending, reassignment_requested_by')
      .eq('reassignment_pending', true)

    console.log('⏰ [CLEANUP] Found leads with pending reassignment:', pendingLeads?.length || 0)

    // Check which ones have actual pending reassignment notifications
    const { data: reassignmentNotifications, error: reassignError } = await serviceClient
      .from('notifications')
      .select('entity_id, metadata')
      .eq('type', 'lead_reassignment_request')
      .eq('is_read', false)

    const activeReassignmentLeadIds = reassignmentNotifications?.map(n => n.metadata?.leadId || n.entity_id) || []
    
    console.log('📋 [CLEANUP] Active reassignment requests:', activeReassignmentLeadIds.length)

    // Clear reassignment_pending for leads without active requests
    if (pendingLeads && pendingLeads.length > 0) {
      const leadsToClean = pendingLeads.filter(lead => !activeReassignmentLeadIds.includes(lead.id))
      
      if (leadsToClean.length > 0) {
        const { error: cleanError } = await serviceClient
          .from('leads')
          .update({ 
            reassignment_pending: false,
            reassignment_requested_by: null
          })
          .in('id', leadsToClean.map(l => l.id))

        console.log('✅ [CLEANUP] Cleared reassignment flags for leads:', leadsToClean.length, cleanError ? 'failed' : 'success')
        
        if (leadsToClean.length > 0) {
          console.log('📝 [CLEANUP] Cleaned leads:')
          leadsToClean.forEach(lead => {
            console.log(`   - ${lead.first_name || ''} ${lead.last_name || ''} (${lead.email})`)
          })
        }
      }
    }

    // Step 3: Get current notification counts for both users
    const { data: adminNotifications } = await serviceClient
      .from('notifications')
      .select('id, type, title, is_read')
      .eq('user_id', ADMIN_USER_ID)
      .eq('is_read', false)

    const { data: salesJNotifications } = await serviceClient
      .from('notifications')
      .select('id, type, title, is_read')
      .eq('user_id', SALES_J_USER_ID)
      .eq('is_read', false)

    console.log('📊 [CLEANUP] Final notification counts:')
    console.log(`   Admin (Janjarat): ${adminNotifications?.length || 0} unread`)
    console.log(`   Sales J: ${salesJNotifications?.length || 0} unread`)

    // Step 4: Clean up old/read notifications (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { error: oldCleanError } = await serviceClient
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo.toISOString())

    console.log('🧹 [CLEANUP] Cleaned old read notifications:', oldCleanError ? 'failed' : 'success')

    return NextResponse.json({
      success: true,
      message: 'System cleanup completed',
      results: {
        testNotificationsRemoved: testNotifications?.length || 0,
        reassignmentFlagsCleared: pendingLeads ? pendingLeads.length - activeReassignmentLeadIds.length : 0,
        currentNotifications: {
          admin: {
            unread: adminNotifications?.length || 0,
            samples: adminNotifications?.slice(0, 3).map(n => ({
              type: n.type,
              title: n.title
            })) || []
          },
          salesJ: {
            unread: salesJNotifications?.length || 0,
            samples: salesJNotifications?.slice(0, 3).map(n => ({
              type: n.type,
              title: n.title
            })) || []
          }
        },
        leadsCleanedUp: pendingLeads?.filter(lead => !activeReassignmentLeadIds.includes(lead.id))
          .map(l => `${l.first_name || ''} ${l.last_name || ''} (${l.email})`) || []
      },
      instructions: [
        'Refresh the leads page to see the changes',
        'Clock icons should be removed from leads without active reassignment requests',
        'Test notifications have been removed from Sales J',
        'The system is now clean and ready for production use'
      ]
    })

  } catch (error) {
    console.error('Error in system cleanup:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}