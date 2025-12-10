// Clean up test notifications for Sales J (deemmi.info@gmail.com)
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🧹 [CLEANUP] Cleaning up test notifications for Sales J...')

    // Get Sales J's user ID
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83' // deemmi.info@gmail.com

    // Get all notifications for Sales J 
    const { data: notifications, error: findError } = await serviceClient
      .from('notifications')
      .select('*')
      .eq('user_id', SALES_J_USER_ID)

    if (findError) {
      console.error('❌ [CLEANUP] Error finding notifications:', findError)
      return NextResponse.json({ error: 'Failed to find notifications' }, { status: 500 })
    }

    console.log('📋 [CLEANUP] Found notifications for Sales J:', notifications?.length || 0)

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No notifications to clean up',
        results: {
          notificationsFound: 0,
          notificationsDeleted: 0
        }
      })
    }

    // Group notifications by type for reporting
    const notificationsByType = notifications.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('📊 [CLEANUP] Notifications by type:', notificationsByType)

    // Delete all notifications for Sales J
    const { error: deleteError, count } = await serviceClient
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('user_id', SALES_J_USER_ID)

    if (deleteError) {
      console.error('❌ [CLEANUP] Error deleting notifications:', deleteError)
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
    }

    console.log(`✅ [CLEANUP] Successfully deleted ${count || 0} notifications`)

    return NextResponse.json({
      success: true,
      message: 'Test notifications cleaned up successfully',
      results: {
        notificationsFound: notifications.length,
        notificationsDeleted: count || 0,
        typeBreakdown: notificationsByType
      },
      instructions: [
        'Sales J notification bell should now be empty',
        'All test notifications have been removed'
      ]
    })

  } catch (error) {
    console.error('Error cleaning up notifications:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}