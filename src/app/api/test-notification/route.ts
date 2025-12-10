import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🧪 [TEST NOTIFICATION] Testing notification system...')
    console.log('🧪 [TEST NOTIFICATION] Current user:', user.id)

    // Check if notifications table exists by trying to count records
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ [TEST NOTIFICATION] Error accessing notifications table:', countError)
      return NextResponse.json({
        success: false,
        error: 'Notifications table not accessible',
        details: countError,
        message: 'The notifications table may not exist or RLS policies are blocking access'
      }, { status: 500 })
    }

    console.log('✅ [TEST NOTIFICATION] Notifications table exists. Current count:', count)

    // Try to insert a test notification
    const testNotification = {
      user_id: user.id,
      type: 'system_alert',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working',
      entity_type: 'system',
      entity_id: null,
      priority: 'low',
      is_read: false,
      action_url: null,
      metadata: { test: true },
      created_at: new Date().toISOString()
    }

    console.log('🧪 [TEST NOTIFICATION] Attempting to insert test notification:', testNotification)

    const { data: insertedNotification, error: insertError } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select()
      .single()

    if (insertError) {
      console.error('❌ [TEST NOTIFICATION] Error inserting notification:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert test notification',
        details: {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        }
      }, { status: 500 })
    }

    console.log('✅ [TEST NOTIFICATION] Successfully inserted test notification:', insertedNotification)

    // Clean up - delete the test notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', insertedNotification.id)

    if (deleteError) {
      console.warn('⚠️ [TEST NOTIFICATION] Could not delete test notification:', deleteError)
    } else {
      console.log('🧹 [TEST NOTIFICATION] Test notification cleaned up')
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications system is working correctly!',
      tableExists: true,
      canInsert: true,
      testNotificationId: insertedNotification.id,
      totalNotifications: count
    })

  } catch (error) {
    console.error('❌ [TEST NOTIFICATION] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
