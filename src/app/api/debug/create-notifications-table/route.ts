// API endpoint to create notifications table
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [CREATE NOTIFICATIONS TABLE] Starting table creation...')

    // Check if table already exists
    const { data: existingTable, error: checkError } = await serviceClient
      .from('notifications')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('✅ [CREATE NOTIFICATIONS TABLE] Table already exists')
      return NextResponse.json({
        success: true,
        message: 'Notifications table already exists',
        action: 'none'
      })
    }

    console.log('📦 [CREATE NOTIFICATIONS TABLE] Table does not exist, creating...')

    // Execute the migration SQL
    const migrationSQL = `
      -- Create notifications table for the notification system
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255),
        priority VARCHAR(20) DEFAULT 'medium',
        is_read BOOLEAN DEFAULT FALSE,
        action_url TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

      -- Enable RLS
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
      DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
      DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
      DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

      -- Create RLS policies
      CREATE POLICY "Users can view own notifications" ON notifications
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can update own notifications" ON notifications
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete own notifications" ON notifications
        FOR DELETE USING (auth.uid() = user_id);

      CREATE POLICY "System can insert notifications" ON notifications
        FOR INSERT WITH CHECK (true);

      -- Create function to automatically update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_notifications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop trigger if exists and create new one
      DROP TRIGGER IF EXISTS set_notifications_updated_at ON notifications;
      CREATE TRIGGER set_notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_notifications_updated_at();

      -- Add comment to document the table
      COMMENT ON TABLE notifications IS 'Stores user notifications for various events like mentions, assignments, etc.';
    `

    // Execute the migration (note: this needs admin privileges)
    const { error: migrationError } = await serviceClient.rpc('exec_sql', {
      sql: migrationSQL
    }).single()

    if (migrationError) {
      // If RPC doesn't exist, try direct approach
      console.log('⚠️ [CREATE NOTIFICATIONS TABLE] RPC method not available, table might need manual creation')
      
      // Test if we can at least insert into the table
      const testNotification = {
        user_id: 'fff0197f-6492-4435-bc5e-672282ceef83', // Sales J
        type: 'system_alert',
        title: 'Notification System Test',
        message: 'Testing notification system setup',
        entity_type: 'system',
        priority: 'low',
        is_read: false
      }

      const { error: insertError } = await serviceClient
        .from('notifications')
        .insert(testNotification)

      if (insertError) {
        console.error('❌ [CREATE NOTIFICATIONS TABLE] Cannot insert test notification:', insertError)
        return NextResponse.json({
          success: false,
          message: 'Notifications table needs to be created manually in Supabase',
          error: insertError.message
        }, { status: 500 })
      } else {
        console.log('✅ [CREATE NOTIFICATIONS TABLE] Test notification inserted successfully')
      }
    }

    console.log('✅ [CREATE NOTIFICATIONS TABLE] Migration completed successfully')

    // Verify table creation
    const { data: verifyData, error: verifyError } = await serviceClient
      .from('notifications')
      .select('count')
      .limit(1)

    if (verifyError) {
      console.error('❌ [CREATE NOTIFICATIONS TABLE] Verification failed:', verifyError)
      return NextResponse.json({
        success: false,
        message: 'Table creation verification failed',
        error: verifyError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications table created successfully',
      action: 'created'
    })

  } catch (error) {
    console.error('Error creating notifications table:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}