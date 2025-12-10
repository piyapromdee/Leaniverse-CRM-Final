import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notification-system'

export async function POST(request: NextRequest) {
  console.log('\n🚀 ============ NOTIFICATION API CALLED ============')
  console.log('⏰ Timestamp:', new Date().toISOString())

  try {
    const supabase = await createClient()
    console.log('✅ Supabase client created')

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 Auth check - User:', user?.id || 'NONE', 'Error:', authError?.message || 'NONE')

    if (authError || !user) {
      console.error('❌ AUTHENTICATION FAILED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 Request body:', JSON.stringify(body, null, 2))

    const { type, title, message, entity_type, entity_id, metadata } = body

    if (!type || !title || !message || !entity_type) {
      console.error('❌ MISSING REQUIRED FIELDS:', { type, title, message, entity_type })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('✅ All required fields present')
    console.log('📋 Notification type:', type)

    // For reassignment requests, send notification to all admin users
    if (type === 'lead_reassignment_request') {
      // Get all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (adminError) {
        console.error('❌ Error fetching admin users:', adminError)
        console.error('Admin query error details:', {
          message: adminError.message,
          details: adminError.details,
          hint: adminError.hint
        })
        return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 })
      }

      console.log('👥 Found admin users:', adminUsers?.length || 0)
      if (adminUsers && adminUsers.length > 0) {
        console.log('Admin user IDs:', adminUsers.map(u => u.id))
      }

      if (!adminUsers || adminUsers.length === 0) {
        console.warn('⚠️ No admin users found in database')
        return NextResponse.json({ error: 'No admin users found' }, { status: 404 })
      }

      // Create notification records for each admin using server-side Supabase client
      const notifications = adminUsers.map(admin => ({
        user_id: admin.id,
        type,
        title,
        message,
        entity_type,
        entity_id: entity_id || null,
        priority: 'high',
        is_read: false,
        action_url: `/admin/assignment-requests`,
        metadata,
        created_at: new Date().toISOString()
      }))

      console.log('📬 About to insert notifications for admins:', JSON.stringify(notifications, null, 2))
      console.log('📊 Number of notifications to insert:', notifications.length)

      const { data: createdNotifications, error: insertError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      console.log('💾 Insert operation completed')
      console.log('📊 Insert result - Data:', createdNotifications ? `${createdNotifications.length} records` : 'NULL')
      console.log('📊 Insert result - Error:', insertError ? 'YES' : 'NO')

      if (insertError) {
        console.error('❌ ============ DATABASE INSERT FAILED ============')
        console.error('❌ Error message:', insertError.message)
        console.error('❌ Error code:', insertError.code)
        console.error('❌ Error details:', insertError.details)
        console.error('❌ Error hint:', insertError.hint)
        console.error('❌ Full error object:', JSON.stringify(insertError, null, 2))
        console.error('❌ ================================================')
        return NextResponse.json({
          error: 'Failed to create notifications',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        }, { status: 500 })
      }

      if (!createdNotifications || createdNotifications.length === 0) {
        console.error('⚠️ ============ NO RECORDS CREATED ============')
        console.error('⚠️ Insert returned no data despite no error')
        console.error('⚠️ This suggests RLS policies may be blocking')
        console.error('⚠️ ==========================================')
        return NextResponse.json({
          error: 'No notifications were created',
          hint: 'RLS policies may be blocking inserts. Check database policies.'
        }, { status: 500 })
      }

      console.log('✅ ============ INSERT SUCCESSFUL ============')
      console.log(`✅ Created ${createdNotifications.length} notification(s)`)
      console.log('✅ Notification IDs:', createdNotifications.map(n => n.id))
      console.log('✅ Created for users:', createdNotifications.map(n => n.user_id))
      console.log('✅ ==========================================\n')

      return NextResponse.json({
        success: true,
        message: `Reassignment request sent to ${createdNotifications?.length || 0} admin(s)`,
        notified_admins: createdNotifications?.length || 0,
        notification_ids: createdNotifications?.map(n => n.id)
      })
    }

    // For other notification types, create for the current user
    const notificationId = await createNotification(
      user.id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      undefined, // priority will be determined automatically
      undefined, // no action_url for general notifications
      metadata
    )

    if (notificationId) {
      return NextResponse.json({ 
        success: true, 
        message: 'Notification created successfully',
        notification_id: notificationId
      })
    } else {
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}