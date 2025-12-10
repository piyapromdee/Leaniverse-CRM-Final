// Test endpoint to create a mention notification for Sales J
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [TEST MENTION] Creating test mention notification for Sales J...')

    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'
    const ADMIN_USER_ID = '1b0bfda8-d888-4ceb-8170-5cfc156f3277'

    // Create a test mention notification (using system_alert temporarily)
    const testNotification = {
      user_id: SALES_J_USER_ID,
      type: 'system_alert', // Using system_alert due to DB constraint
      title: 'You were mentioned in a note',
      message: 'Janjarat mentioned you in a note on lead: Test Lead',
      entity_type: 'lead',
      entity_id: 'eb77925c-6141-4027-847b-5ea49b86b18f', // A real lead ID from the system
      priority: 'medium',
      is_read: false,
      action_url: '/dashboard/leads?highlight=eb77925c-6141-4027-847b-5ea49b86b18f',
      metadata: {
        leadId: 'eb77925c-6141-4027-847b-5ea49b86b18f',
        leadName: 'Test Lead',
        noteId: 'test-note-id',
        authorId: ADMIN_USER_ID,
        authorName: 'Janjarat',
        notePreview: 'Hey @SalesJ, please check this lead urgently!'
      }
    }

    const { data: notification, error: insertError } = await serviceClient
      .from('notifications')
      .insert(testNotification)
      .select()
      .single()

    if (insertError) {
      console.error('❌ [TEST MENTION] Failed to create test notification:', insertError)
      return NextResponse.json({
        success: false,
        message: 'Failed to create test notification',
        error: insertError.message
      }, { status: 500 })
    }

    console.log('✅ [TEST MENTION] Test notification created successfully:', notification)

    // Also check current notifications for Sales J
    const { data: allNotifications, error: fetchError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5)

    if (fetchError) {
      console.error('❌ [TEST MENTION] Failed to fetch notifications:', fetchError)
    } else {
      console.log('📬 [TEST MENTION] Current notifications for Sales J:', allNotifications?.length || 0)
      if (allNotifications && allNotifications.length > 0) {
        allNotifications.forEach((n, i) => {
          console.log(`  ${i + 1}. Type: ${n.type}, Title: ${n.title}, Read: ${n.is_read}, Created: ${n.created_at}`)
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test mention notification created for Sales J',
      notification: notification,
      totalNotifications: allNotifications?.length || 0,
      recentNotifications: allNotifications || []
    })

  } catch (error) {
    console.error('Error creating test mention notification:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}