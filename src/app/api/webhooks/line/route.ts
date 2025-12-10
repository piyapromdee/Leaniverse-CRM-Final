// LINE Messenger Webhook API
// Receives webhook events from LINE and creates leads automatically

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// LINE webhook event types
interface LineWebhookEvent {
  type: string
  timestamp: number
  source: {
    type: string
    userId?: string
    groupId?: string
    roomId?: string
  }
  replyToken?: string
  message?: {
    id: string
    type: string
    text?: string
  }
  postback?: {
    data: string
  }
}

interface LineWebhookBody {
  destination: string
  events: LineWebhookEvent[]
}

// Verify LINE signature for security
function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')
  return hash === signature
}

// Get LINE user profile using the Messaging API
async function getLineUserProfile(userId: string): Promise<{ displayName: string; pictureUrl?: string; statusMessage?: string } | null> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.log('⚠️ [LINE] No channel access token, skipping profile fetch')
    return null
  }

  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`
      }
    })

    if (!response.ok) {
      console.error('❌ [LINE] Failed to get user profile:', response.status)
      return null
    }

    const profile = await response.json()
    console.log('✅ [LINE] Got user profile:', profile.displayName)
    return {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage
    }
  } catch (error) {
    console.error('❌ [LINE] Error fetching user profile:', error)
    return null
  }
}

// GET endpoint for LINE webhook verification
export async function GET(request: NextRequest) {
  // LINE doesn't use GET for verification, but we keep this for health check
  return NextResponse.json({
    status: 'ok',
    message: 'LINE Webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

// POST endpoint for receiving LINE webhook events
export async function POST(request: NextRequest) {
  try {
    console.log('📱 [LINE WEBHOOK] Received webhook request')

    // Get raw body for signature verification
    const rawBody = await request.text()
    const body: LineWebhookBody = JSON.parse(rawBody)

    // Verify LINE signature (optional but recommended for production)
    const channelSecret = process.env.LINE_CHANNEL_SECRET
    const signature = request.headers.get('x-line-signature')

    // Only verify if we have a real channel secret (not placeholder)
    if (channelSecret && signature && !channelSecret.includes('your_')) {
      const isValid = verifyLineSignature(rawBody, signature, channelSecret)
      if (!isValid) {
        console.error('❌ [LINE WEBHOOK] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      console.log('✅ [LINE WEBHOOK] Signature verified')
    } else {
      console.log('⚠️ [LINE WEBHOOK] Signature verification skipped (no secret configured)')
    }

    // Create Supabase service client (bypasses RLS for webhook operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results: any[] = []

    // Process each event
    for (const event of body.events) {
      console.log('📨 [LINE WEBHOOK] Processing event:', event.type)

      // Only process message events for lead creation
      if (event.type === 'message' && event.source.userId) {
        const lineUserId = event.source.userId
        const messageText = event.message?.text || ''

        console.log('👤 [LINE WEBHOOK] LINE User ID:', lineUserId)
        console.log('💬 [LINE WEBHOOK] Message:', messageText.substring(0, 100))

        // Check if lead already exists with this LINE ID
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, first_name, last_name')
          .eq('line_user_id', lineUserId)
          .single()

        if (existingLead) {
          console.log('ℹ️ [LINE WEBHOOK] Lead already exists:', existingLead.id)

          // Add activity/note to existing lead
          await supabase
            .from('lead_activities')
            .insert({
              lead_id: existingLead.id,
              type: 'note',
              description: `[LINE Message] ${messageText}`,
              created_at: new Date().toISOString()
            })

          results.push({
            action: 'note_added',
            leadId: existingLead.id,
            lineUserId
          })
        } else {
          // Get LINE user profile (display name, picture, etc.)
          const lineProfile = await getLineUserProfile(lineUserId)

          // Parse display name into first/last name
          let firstName = 'LINE User'
          let lastName = lineUserId.substring(0, 8)
          if (lineProfile?.displayName) {
            const nameParts = lineProfile.displayName.trim().split(' ')
            firstName = nameParts[0] || 'LINE User'
            lastName = nameParts.slice(1).join(' ') || lineUserId.substring(0, 8)
          }

          // Get default user/org for webhook leads (try sales first, then admin)
          const { data: defaultUser } = await supabase
            .from('profiles')
            .select('id, org_id')
            .eq('org_id', '8a6b275c-4265-4c46-a680-8cd4b78f14db')
            .limit(1)
            .single()

          // Create new lead from LINE message
          // NOTE: assigned_to is null so ALL sales users can see and respond quickly
          const leadData = {
            user_id: defaultUser?.id || '1b0bfda8-d888-4ceb-8170-5cfc156f3277',
            org_id: defaultUser?.org_id || '8a6b275c-4265-4c46-a680-8cd4b78f14db',
            assigned_to: null, // Unassigned - visible to all sales for quick response
            first_name: firstName,
            last_name: lastName,
            email: '',
            source: 'LINE Messenger',
            channel: 'line',
            status: 'new',
            priority: 'medium',
            line_user_id: lineUserId,
            notes: `First message: ${messageText.substring(0, 500)}${lineProfile?.statusMessage ? `\n\nLINE Status: ${lineProfile.statusMessage}` : ''}${lineProfile?.pictureUrl ? `\n\nProfile Picture: ${lineProfile.pictureUrl}` : ''}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: newLead, error: createError } = await supabase
            .from('leads')
            .insert(leadData)
            .select()
            .single()

          if (createError) {
            console.error('❌ [LINE WEBHOOK] Error creating lead:', createError)
            results.push({
              action: 'error',
              error: createError.message,
              lineUserId
            })
          } else {
            console.log('✅ [LINE WEBHOOK] New lead created:', newLead.id)
            results.push({
              action: 'lead_created',
              leadId: newLead.id,
              lineUserId
            })
          }
        }
      } else if (event.type === 'follow') {
        // User added the LINE bot
        const lineUserId = event.source.userId

        if (lineUserId) {
          // Check if lead exists
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single()

          if (!existingLead) {
            // Get default user/org for webhook leads
            const { data: defaultUser } = await supabase
              .from('profiles')
              .select('id, org_id')
              .eq('role', 'admin')
              .limit(1)
              .single()

            // Create lead for new follower
            const leadData = {
              user_id: defaultUser?.id || null,
              org_id: defaultUser?.org_id || '8a6b275c-4265-4c46-a680-8cd4b78f14db',
              first_name: 'LINE User',
              last_name: lineUserId.substring(0, 8),
              email: '',
              source: 'LINE Messenger',
              channel: 'line',
              status: 'new',
              priority: 'medium',
              line_user_id: lineUserId,
              notes: 'User followed the LINE account',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: newLead, error } = await supabase
              .from('leads')
              .insert(leadData)
              .select()
              .single()

            if (!error && newLead) {
              console.log('✅ [LINE WEBHOOK] Lead created from follow event:', newLead.id)
              results.push({
                action: 'lead_created_from_follow',
                leadId: newLead.id,
                lineUserId
              })
            }
          }
        }
      }
    }

    console.log('✅ [LINE WEBHOOK] Processed', results.length, 'events')

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('❌ [LINE WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
