// Force test the notification system for Sales J
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'

    console.log('🔧 [FORCE TEST] Running comprehensive notification test for Sales J...')

    // Step 1: Clear all existing notifications for Sales J
    const { error: deleteError } = await serviceClient
      .from('notifications')
      .delete()
      .eq('user_id', SALES_J_USER_ID)

    console.log('🧹 [FORCE TEST] Cleared existing notifications:', deleteError?.message || 'success')

    // Step 2: Create a very simple test notification
    const simpleNotification = {
      user_id: SALES_J_USER_ID,
      type: 'system_alert',
      title: 'TEST: You have a new notification',
      message: 'This is a test notification - if you can see this, the system is working!',
      entity_type: 'system',
      priority: 'high',
      is_read: false
    }

    const { data: created, error: createError } = await serviceClient
      .from('notifications')
      .insert(simpleNotification)
      .select()
      .single()

    console.log('📝 [FORCE TEST] Simple notification created:', created?.id || 'failed', createError?.message || 'success')

    // Step 3: Verify the notification exists
    const { data: verify, error: verifyError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)
      .eq('is_read', false)

    console.log('✅ [FORCE TEST] Verification check - found notifications:', verify?.length || 0)

    // Step 4: Test the notification system functions
    let systemTest = null
    try {
      // Import the notification system functions
      const notificationSystem = await import('@/lib/notification-system')
      const userNotifications = await notificationSystem.getUserNotifications(SALES_J_USER_ID, 5)
      const unreadCount = await notificationSystem.getUnreadNotificationCount(SALES_J_USER_ID)
      
      systemTest = {
        getUserNotifications: userNotifications?.length || 0,
        getUnreadCount: unreadCount || 0,
        success: true
      }
      
      console.log('🔧 [FORCE TEST] System functions test:', systemTest)
    } catch (error) {
      systemTest = {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }
      console.error('❌ [FORCE TEST] System functions failed:', error)
    }

    // Step 5: Check RLS policies by testing direct query
    let rlsTest = null
    try {
      // Create a regular client to test RLS (simulating user access)
      const testClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // This should fail with RLS unless user is authenticated
      const { data: rlsData, error: rlsError } = await testClient
        .from('notifications')
        .select('*')
        .eq('user_id', SALES_J_USER_ID)
        .limit(1)

      rlsTest = {
        success: !rlsError,
        error: rlsError?.message || null,
        foundRecords: rlsData?.length || 0
      }
      
      console.log('🔒 [FORCE TEST] RLS test (should fail):', rlsTest)
    } catch (error) {
      rlsTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification test completed for Sales J',
      results: {
        notificationCreated: {
          success: !!created,
          id: created?.id || null,
          title: created?.title || null,
          error: createError?.message || null
        },
        verificationCheck: {
          found: verify?.length || 0,
          notifications: verify?.map(n => ({
            id: n.id,
            title: n.title,
            type: n.type,
            is_read: n.is_read,
            created_at: n.created_at
          })) || [],
          error: verifyError?.message || null
        },
        systemFunctions: systemTest,
        rlsPolicyTest: rlsTest
      },
      instructions: [
        '1. Refresh the browser page as Sales J',
        '2. Check the notification bell - should show "1" badge',
        '3. Click the bell to see the test notification',
        '4. If still not visible, check browser console for errors',
        '5. Try logging out and logging back in as Sales J'
      ],
      troubleshooting: [
        'Check browser network tab for failed API requests',
        'Verify Sales J is properly logged in (check /api/auth/user)',
        'Check if notification polling is working (every 2 minutes)',
        'Inspect NotificationBell component for JavaScript errors'
      ]
    })

  } catch (error) {
    console.error('Error in force notification test:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}