// Fix notification type constraint to allow lead_mention
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [FIX NOTIFICATION TYPE] Updating type column to allow lead_mention...')

    // First, let's check if we can just insert without the type restriction
    // by updating the column to be less restrictive
    const { data: alterResult, error: alterError } = await serviceClient
      .from('notifications')
      .select('type')
      .limit(1)

    if (alterError) {
      console.error('❌ [FIX NOTIFICATION TYPE] Cannot access notifications table:', alterError)
    }

    // Try to directly update type column constraint by recreating it without constraint
    // This is a workaround since we can't directly execute ALTER TABLE commands
    
    // Instead, let's test if we can insert with a different approach
    const testNotification = {
      user_id: 'fff0197f-6492-4435-bc5e-672282ceef83',
      type: 'system_alert', // Use a type that should work
      title: 'Test Notification System',
      message: 'Testing if notification system is working',
      entity_type: 'system',
      priority: 'medium',
      is_read: false
    }

    const { data: testInsert, error: testError } = await serviceClient
      .from('notifications')
      .insert(testNotification)
      .select()
      .single()

    if (testError) {
      console.error('❌ [FIX NOTIFICATION TYPE] Cannot insert test notification:', testError)
      return NextResponse.json({
        success: false,
        message: 'Cannot insert notifications. Table constraints may need manual update in Supabase dashboard',
        error: testError.message,
        suggestion: 'Please go to Supabase dashboard and remove the check constraint on the notifications.type column, or update it to include "lead_mention"'
      }, { status: 500 })
    }

    console.log('✅ [FIX NOTIFICATION TYPE] Test notification inserted:', testInsert)

    // Now try with lead_mention by updating the existing record
    const { data: updateResult, error: updateError } = await serviceClient
      .from('notifications')
      .update({ type: 'lead_mention' })
      .eq('id', testInsert.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ [FIX NOTIFICATION TYPE] Cannot update to lead_mention type:', updateError)
      
      // Clean up test notification
      await serviceClient
        .from('notifications')
        .delete()
        .eq('id', testInsert.id)
      
      return NextResponse.json({
        success: false,
        message: 'The notifications table has a check constraint that prevents "lead_mention" type',
        error: updateError.message,
        action_required: 'Manual Update Required',
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the Table Editor',
          '3. Select the "notifications" table',
          '4. Click on the "type" column',
          '5. Remove the check constraint or update it to include "lead_mention"',
          '6. Alternatively, change the column type to TEXT without constraints'
        ]
      }, { status: 500 })
    }

    console.log('✅ [FIX NOTIFICATION TYPE] Successfully updated to lead_mention type')

    // Clean up test notification
    await serviceClient
      .from('notifications')
      .delete()
      .eq('id', testInsert.id)

    return NextResponse.json({
      success: true,
      message: 'Notification type constraint appears to be flexible. lead_mention type should work.',
      test_performed: 'Successfully inserted and updated notification with lead_mention type'
    })

  } catch (error) {
    console.error('Error fixing notification type:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      action_required: 'Please check Supabase dashboard to update notifications.type column constraint'
    }, { status: 500 })
  }
}