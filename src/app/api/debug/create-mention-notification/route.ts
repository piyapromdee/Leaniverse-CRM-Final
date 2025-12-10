// Create a proper mention notification for Sales J
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'
    const ADMIN_USER_ID = '1b0bfda8-d888-4ceb-8170-5cfc156f3277'

    console.log('🔧 [CREATE MENTION] Creating mention notification for Sales J...')

    // First, clear all old notifications for Sales J to avoid confusion
    const { error: deleteError } = await serviceClient
      .from('notifications')
      .delete()
      .eq('user_id', SALES_J_USER_ID)

    if (deleteError) {
      console.warn('⚠️ [CREATE MENTION] Could not clear old notifications:', deleteError.message)
    } else {
      console.log('✅ [CREATE MENTION] Cleared old notifications')
    }

    // Get the first lead that Sales J can see
    const { data: leads, error: leadsError } = await serviceClient
      .from('leads')
      .select('id, first_name, last_name, company_name, email')
      .eq('org_id', '8a6b275c-4265-4c46-a680-8cd4b78f14db')
      .limit(1)

    if (leadsError || !leads || leads.length === 0) {
      console.error('❌ [CREATE MENTION] No leads found:', leadsError)
      return NextResponse.json({ error: 'No leads found' }, { status: 404 })
    }

    const lead = leads[0]
    const leadName = lead.first_name && lead.last_name 
      ? `${lead.first_name} ${lead.last_name}`
      : lead.company_name || lead.email

    console.log('📋 [CREATE MENTION] Using lead:', leadName, lead.id)

    // Create the mention notification with proper action URL
    const mentionNotification = {
      user_id: SALES_J_USER_ID,
      type: 'system_alert', // Using system_alert since lead_mention isn't allowed by DB constraint
      title: 'You were mentioned in a note',
      message: `Janjarat mentioned you in a note on lead: ${leadName}`,
      entity_type: 'lead',
      entity_id: lead.id,
      priority: 'medium',
      is_read: false,
      action_url: `/dashboard/leads?highlight=${lead.id}`,
      metadata: {
        leadId: lead.id,
        leadName: leadName,
        leadEmail: lead.email,
        noteId: `note-${Date.now()}`,
        authorId: ADMIN_USER_ID,
        authorName: 'Janjarat',
        notePreview: 'Hey @SalesJ, please check this lead ASAP! The client is interested.',
        notificationType: 'mention' // Custom flag to identify this as a mention
      }
    }

    const { data: notification, error: createError } = await serviceClient
      .from('notifications')
      .insert(mentionNotification)
      .select()
      .single()

    if (createError) {
      console.error('❌ [CREATE MENTION] Error creating notification:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    console.log('✅ [CREATE MENTION] Created mention notification:', notification.id)
    console.log('🔗 [CREATE MENTION] Action URL:', notification.action_url)

    return NextResponse.json({
      success: true,
      message: 'Mention notification created for Sales J',
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        action_url: notification.action_url,
        entity_id: notification.entity_id,
        type: notification.type
      },
      leadInfo: {
        id: lead.id,
        name: leadName,
        email: lead.email
      },
      instructions: [
        '1. Refresh the page as Sales J',
        '2. Click on the notification bell',
        `3. Click on the notification: "${notification.title}"`,
        `4. It should navigate to: ${notification.action_url}`,
        '5. The lead should be highlighted in the list'
      ]
    })

  } catch (error) {
    console.error('Error creating mention notification:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}