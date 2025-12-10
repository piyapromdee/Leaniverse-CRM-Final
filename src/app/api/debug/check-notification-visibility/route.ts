// Debug why Sales J isn't seeing notifications
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔍 [DEBUG VISIBILITY] Checking notification visibility for current user...')

    // Get current user (should be Sales J when testing)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [DEBUG VISIBILITY] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 [DEBUG VISIBILITY] Current user:', user.id, user.email)

    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'
    const isCurrentUserSalesJ = user.id === SALES_J_USER_ID

    console.log('🎯 [DEBUG VISIBILITY] Is current user Sales J?', isCurrentUserSalesJ)

    // Test 1: Check notifications using regular client (what the UI uses)
    const { data: userNotifications, error: userError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('📬 [DEBUG VISIBILITY] User notifications (regular client):', userNotifications?.length || 0, 'Error:', userError?.message || 'none')

    // Test 2: Check notifications using service client (bypass RLS)
    const { data: serviceNotifications, error: serviceError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('📬 [DEBUG VISIBILITY] Service notifications (service client):', serviceNotifications?.length || 0, 'Error:', serviceError?.message || 'none')

    // Test 3: Check if Sales J has any notifications at all
    const { data: salesJNotifications, error: salesJError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('📬 [DEBUG VISIBILITY] Sales J notifications (service client):', salesJNotifications?.length || 0, 'Error:', salesJError?.message || 'none')

    // Test 4: Check notification system functions
    let notificationSystemTest = null
    try {
      const { getUserNotifications, getUnreadNotificationCount } = await import('@/lib/notification-system')
      const systemNotifications = await getUserNotifications(user.id, 5)
      const unreadCount = await getUnreadNotificationCount(user.id)
      
      notificationSystemTest = {
        notifications: systemNotifications?.length || 0,
        unreadCount: unreadCount || 0,
        error: null
      }
      
      console.log('🔧 [DEBUG VISIBILITY] Notification system test:', notificationSystemTest)
    } catch (systemError) {
      notificationSystemTest = {
        notifications: 0,
        unreadCount: 0,
        error: systemError instanceof Error ? systemError.message : 'Unknown error'
      }
      console.error('❌ [DEBUG VISIBILITY] Notification system error:', systemError)
    }

    // Test 5: Force create a simple notification for current user
    const testNotification = {
      user_id: user.id,
      type: 'system_alert',
      title: 'Visibility Test Notification',
      message: 'This is a test to check if notifications are visible',
      entity_type: 'system',
      priority: 'low',
      is_read: false,
      created_at: new Date().toISOString()
    }

    const { data: createdTest, error: createTestError } = await serviceClient
      .from('notifications')
      .insert(testNotification)
      .select()
      .single()

    console.log('🧪 [DEBUG VISIBILITY] Test notification created:', !!createdTest, 'Error:', createTestError?.message || 'none')

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        isSalesJ: isCurrentUserSalesJ
      },
      tests: {
        userClient: {
          count: userNotifications?.length || 0,
          error: userError?.message || null,
          hasRLSIssue: !!userError && userError.message?.includes('RLS')
        },
        serviceClient: {
          count: serviceNotifications?.length || 0,
          error: serviceError?.message || null
        },
        salesJSpecific: {
          count: salesJNotifications?.length || 0,
          error: salesJError?.message || null,
          sample: salesJNotifications?.slice(0, 2)?.map(n => ({
            id: n.id,
            title: n.title,
            type: n.type,
            is_read: n.is_read,
            created_at: n.created_at
          })) || []
        },
        notificationSystem: notificationSystemTest,
        testNotificationCreated: {
          success: !!createdTest,
          id: createdTest?.id || null,
          error: createTestError?.message || null
        }
      },
      recommendations: isCurrentUserSalesJ ? [
        'Refresh the page and check the notification bell',
        'Check browser console for errors',
        'Try logging out and back in',
        'Check if RLS policies are blocking access'
      ] : [
        'Please test while logged in as Sales J (deemmi.info@gmail.com)',
        `Current user is: ${user.email}`
      ]
    })

  } catch (error) {
    console.error('Error in notification visibility check:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}