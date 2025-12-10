// Check the specific notification that Sales J should see
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'

    console.log('🔍 [CHECK NOTIFICATION] Checking Sales J notifications...')

    // Get the latest unread notifications for Sales J
    const { data: notifications, error } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('❌ [CHECK NOTIFICATION] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('📬 [CHECK NOTIFICATION] Found unread notifications:', notifications?.length || 0)

    if (notifications && notifications.length > 0) {
      notifications.forEach((n, i) => {
        console.log(`🔔 [NOTIFICATION ${i + 1}]:`)
        console.log(`  ID: ${n.id}`)
        console.log(`  Title: ${n.title}`)
        console.log(`  Message: ${n.message}`)
        console.log(`  Type: ${n.type}`)
        console.log(`  Entity ID: ${n.entity_id}`)
        console.log(`  Action URL: ${n.action_url}`)
        console.log(`  Priority: ${n.priority}`)
        console.log(`  Is Read: ${n.is_read}`)
        console.log(`  Created: ${n.created_at}`)
        console.log(`  Metadata:`, JSON.stringify(n.metadata, null, 2))
      })

      // Check if the referenced lead exists and is accessible
      if (notifications[0].entity_id) {
        const { data: lead, error: leadError } = await serviceClient
          .from('leads')
          .select('id, first_name, last_name, company_name, email, org_id')
          .eq('id', notifications[0].entity_id)
          .single()

        if (leadError) {
          console.error('❌ [CHECK NOTIFICATION] Lead not found:', leadError)
        } else {
          console.log('✅ [CHECK NOTIFICATION] Referenced lead exists:', {
            id: lead.id,
            name: lead.first_name && lead.last_name 
              ? `${lead.first_name} ${lead.last_name}`
              : lead.company_name || lead.email,
            email: lead.email,
            org_id: lead.org_id
          })
        }

        return NextResponse.json({
          success: true,
          unreadNotifications: notifications,
          referencedLead: lead || null,
          debugInfo: {
            hasActionUrl: !!notifications[0].action_url,
            actionUrl: notifications[0].action_url,
            entityId: notifications[0].entity_id,
            type: notifications[0].type,
            title: notifications[0].title
          }
        })
      }
    }

    return NextResponse.json({
      success: false,
      message: 'No unread notifications found',
      allNotifications: notifications || []
    })

  } catch (error) {
    console.error('Error checking notification URL:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}