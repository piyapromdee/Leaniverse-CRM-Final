// Check what leads Sales J can actually see
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'
    const ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db'

    console.log('🔍 [CHECK LEADS] Checking leads accessible to Sales J...')

    // Get all leads with the correct org_id
    const { data: allLeads, error: leadsError } = await serviceClient
      .from('leads')
      .select('id, first_name, last_name, company_name, email, org_id, user_id')
      .eq('org_id', ORG_ID)
      .limit(10)

    if (leadsError) {
      console.error('❌ [CHECK LEADS] Error fetching leads:', leadsError)
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    console.log('📋 [CHECK LEADS] Found leads:', allLeads?.length || 0)

    // Check current notifications for Sales J
    const { data: notifications, error: notifError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('🔔 [CHECK LEADS] Current notifications for Sales J:', notifications?.length || 0)

    // Create a proper mention notification for a real lead
    if (allLeads && allLeads.length > 0) {
      const firstLead = allLeads[0]
      const leadName = firstLead.first_name && firstLead.last_name 
        ? `${firstLead.first_name} ${firstLead.last_name}`
        : firstLead.company_name || firstLead.email

      console.log('✅ [CHECK LEADS] Creating notification for real lead:', leadName, firstLead.id)

      // Delete old test notifications first
      await serviceClient
        .from('notifications')
        .delete()
        .eq('user_id', SALES_J_USER_ID)
        .eq('title', 'You were mentioned in a note')

      // Create new notification with real lead
      const newNotification = {
        user_id: SALES_J_USER_ID,
        type: 'system_alert',
        title: 'You were mentioned in a note',
        message: `Janjarat mentioned you in a note on lead: ${leadName}`,
        entity_type: 'lead',
        entity_id: firstLead.id,
        priority: 'medium',
        is_read: false,
        action_url: `/dashboard/leads?highlight=${firstLead.id}`,
        metadata: {
          leadId: firstLead.id,
          leadName: leadName,
          noteId: 'test-note-' + Date.now(),
          authorId: '1b0bfda8-d888-4ceb-8170-5cfc156f3277',
          authorName: 'Janjarat',
          notePreview: 'Hey @SalesJ, please follow up with this lead urgently!'
        }
      }

      const { data: newNotif, error: createError } = await serviceClient
        .from('notifications')
        .insert(newNotification)
        .select()
        .single()

      if (createError) {
        console.error('❌ [CHECK LEADS] Error creating notification:', createError)
      } else {
        console.log('✅ [CHECK LEADS] Created notification:', newNotif.id)
      }

      return NextResponse.json({
        success: true,
        salesJUserId: SALES_J_USER_ID,
        orgId: ORG_ID,
        totalLeads: allLeads.length,
        firstLead: {
          id: firstLead.id,
          name: leadName,
          email: firstLead.email,
          org_id: firstLead.org_id
        },
        sampleLeads: allLeads.slice(0, 5).map(l => ({
          id: l.id,
          name: l.first_name && l.last_name 
            ? `${l.first_name} ${l.last_name}`
            : l.company_name || l.email,
          email: l.email
        })),
        notificationCreated: !createError,
        notifications: notifications?.map(n => ({
          id: n.id,
          title: n.title,
          entity_id: n.entity_id,
          is_read: n.is_read,
          created_at: n.created_at
        }))
      })
    }

    return NextResponse.json({
      success: false,
      message: 'No leads found for the organization',
      orgId: ORG_ID
    })

  } catch (error) {
    console.error('Error checking Sales J leads:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}