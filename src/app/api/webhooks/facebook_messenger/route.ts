// Facebook Messenger Webhook API
// Receives webhook events from Facebook and creates leads automatically

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Facebook webhook event types
interface FBMessagingEvent {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: {
    mid: string
    text?: string
    attachments?: any[]
  }
  postback?: {
    title: string
    payload: string
  }
  referral?: {
    ref: string
    source: string
    type: string
  }
}

interface FBWebhookEntry {
  id: string
  time: number
  messaging: FBMessagingEvent[]
}

interface FBWebhookBody {
  object: string
  entry: FBWebhookEntry[]
}

// Verify Facebook signature for security
function verifyFacebookSignature(body: string, signature: string, appSecret: string): boolean {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Get Facebook user profile using the Graph API
async function getFacebookUserProfile(userId: string, pageAccessToken: string): Promise<{ first_name?: string; last_name?: string; profile_pic?: string } | null> {
  if (!pageAccessToken) {
    console.log('⚠️ [FB] No page access token, skipping profile fetch')
    return null
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
    )

    if (!response.ok) {
      console.error('❌ [FB] Failed to get user profile:', response.status)
      return null
    }

    const profile = await response.json()
    console.log('✅ [FB] Got user profile:', profile.first_name, profile.last_name)
    return profile
  } catch (error) {
    console.error('❌ [FB] Error fetching user profile:', error)
    return null
  }
}

// GET endpoint for Facebook webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Facebook sends these parameters for verification
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('🔵 [FB WEBHOOK] Verification request received')
  console.log('🔵 [FB WEBHOOK] Mode:', mode)
  console.log('🔵 [FB WEBHOOK] Token:', token)

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    const verifyToken = process.env.FB_VERIFY_TOKEN || 'dummi_co_verify_token'

    if (mode === 'subscribe' && token === verifyToken) {
      // Respond with the challenge token from the request
      console.log('✅ [FB WEBHOOK] Verification successful')
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    } else {
      console.error('❌ [FB WEBHOOK] Verification failed - token mismatch')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Default response for health check
  return NextResponse.json({
    status: 'ok',
    message: 'Facebook Messenger Webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

// POST endpoint for receiving Facebook webhook events
export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [FB WEBHOOK] Received webhook request')

    // Get raw body for signature verification
    const rawBody = await request.text()
    const body: FBWebhookBody = JSON.parse(rawBody)

    // Verify Facebook signature (optional but recommended for production)
    const appSecret = process.env.FB_APP_SECRET
    const signature = request.headers.get('x-hub-signature-256')

    if (appSecret && signature) {
      try {
        const isValid = verifyFacebookSignature(rawBody, signature, appSecret)
        if (!isValid) {
          console.error('❌ [FB WEBHOOK] Invalid signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
        console.log('✅ [FB WEBHOOK] Signature verified')
      } catch (sigError) {
        console.warn('⚠️ [FB WEBHOOK] Signature verification skipped:', sigError)
      }
    }

    // Only process page events
    if (body.object !== 'page') {
      console.log('ℹ️ [FB WEBHOOK] Not a page event, ignoring')
      return NextResponse.json({ status: 'ignored' })
    }

    // Create Supabase service client (bypasses RLS for webhook operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results: any[] = []

    // Process each entry
    for (const entry of body.entry) {
      // Process each messaging event
      for (const event of entry.messaging) {
        const senderId = event.sender.id
        console.log('👤 [FB WEBHOOK] Sender ID:', senderId)

        // Skip if sender is the page itself
        if (senderId === entry.id) {
          continue
        }

        // Check if this is a message event
        if (event.message) {
          const messageText = event.message.text || '[Attachment]'
          console.log('💬 [FB WEBHOOK] Message:', messageText.substring(0, 100))

          // Check if lead already exists with this FB User ID
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id, first_name, last_name')
            .eq('fb_user_id', senderId)
            .single()

          if (existingLead) {
            console.log('ℹ️ [FB WEBHOOK] Lead already exists:', existingLead.id)

            // Add activity/note to existing lead
            await supabase
              .from('lead_activities')
              .insert({
                lead_id: existingLead.id,
                type: 'note',
                description: `[Facebook Message] ${messageText}`,
                created_at: new Date().toISOString()
              })

            results.push({
              action: 'note_added',
              leadId: existingLead.id,
              fbUserId: senderId
            })
          } else {
            // Get Facebook user profile (requires FB_PAGE_ACCESS_TOKEN)
            const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN
            const fbProfile = pageAccessToken ? await getFacebookUserProfile(senderId, pageAccessToken) : null

            // Get default user/org for webhook leads (admin user)
            const { data: defaultUser } = await supabase
              .from('profiles')
              .select('id, org_id')
              .eq('role', 'admin')
              .limit(1)
              .single()

            // Create new lead from Facebook message
            // NOTE: assigned_to is null so ALL sales users can see and respond quickly
            const leadData = {
              user_id: defaultUser?.id || '1b0bfda8-d888-4ceb-8170-5cfc156f3277',
              org_id: defaultUser?.org_id || '8a6b275c-4265-4c46-a680-8cd4b78f14db',
              assigned_to: null, // Unassigned - visible to all sales for quick response
              first_name: fbProfile?.first_name || 'FB User',
              last_name: fbProfile?.last_name || senderId.substring(0, 8),
              email: '',
              source: 'Facebook Messenger',
              channel: 'facebook',
              status: 'new',
              priority: 'medium',
              fb_user_id: senderId,
              notes: `First message: ${messageText.substring(0, 500)}${fbProfile?.profile_pic ? `\n\nProfile Picture: ${fbProfile.profile_pic}` : ''}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: newLead, error: createError } = await supabase
              .from('leads')
              .insert(leadData)
              .select()
              .single()

            if (createError) {
              console.error('❌ [FB WEBHOOK] Error creating lead:', createError)
              results.push({
                action: 'error',
                error: createError.message,
                fbUserId: senderId
              })
            } else {
              console.log('✅ [FB WEBHOOK] New lead created:', newLead.id)
              results.push({
                action: 'lead_created',
                leadId: newLead.id,
                fbUserId: senderId
              })
            }
          }
        }

        // Handle postback events (button clicks)
        if (event.postback) {
          console.log('🔘 [FB WEBHOOK] Postback:', event.postback.title)

          // Check if lead exists
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('fb_user_id', senderId)
            .single()

          if (!existingLead) {
            // Get default user/org for webhook leads
            const { data: defaultUser } = await supabase
              .from('profiles')
              .select('id, org_id')
              .eq('role', 'admin')
              .limit(1)
              .single()

            // Create lead from postback
            const leadData = {
              user_id: defaultUser?.id || null,
              org_id: defaultUser?.org_id || '8a6b275c-4265-4c46-a680-8cd4b78f14db',
              first_name: 'FB User',
              last_name: senderId.substring(0, 8),
              email: '',
              source: 'Facebook Messenger',
              channel: 'facebook',
              status: 'new',
              priority: 'medium',
              fb_user_id: senderId,
              notes: `Clicked button: ${event.postback.title}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: newLead, error } = await supabase
              .from('leads')
              .insert(leadData)
              .select()
              .single()

            if (!error && newLead) {
              console.log('✅ [FB WEBHOOK] Lead created from postback:', newLead.id)
              results.push({
                action: 'lead_created_from_postback',
                leadId: newLead.id,
                fbUserId: senderId
              })
            }
          }
        }

        // Handle referral events (ads, m.me links)
        if (event.referral) {
          console.log('🔗 [FB WEBHOOK] Referral:', event.referral.source)

          // Check if lead exists
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('fb_user_id', senderId)
            .single()

          if (!existingLead) {
            // Get default user/org for webhook leads
            const { data: defaultUser } = await supabase
              .from('profiles')
              .select('id, org_id')
              .eq('role', 'admin')
              .limit(1)
              .single()

            // Create lead from referral
            const leadData = {
              user_id: defaultUser?.id || null,
              org_id: defaultUser?.org_id || '8a6b275c-4265-4c46-a680-8cd4b78f14db',
              first_name: 'FB User',
              last_name: senderId.substring(0, 8),
              email: '',
              source: 'Facebook Messenger',
              channel: 'facebook',
              status: 'new',
              priority: 'medium',
              fb_user_id: senderId,
              notes: `Referred from: ${event.referral.source} (${event.referral.ref || 'no ref'})`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: newLead, error } = await supabase
              .from('leads')
              .insert(leadData)
              .select()
              .single()

            if (!error && newLead) {
              console.log('✅ [FB WEBHOOK] Lead created from referral:', newLead.id)
              results.push({
                action: 'lead_created_from_referral',
                leadId: newLead.id,
                fbUserId: senderId,
                referralSource: event.referral.source
              })
            }
          }
        }
      }
    }

    console.log('✅ [FB WEBHOOK] Processed', results.length, 'events')

    // Facebook requires a 200 response within 20 seconds
    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('❌ [FB WEBHOOK] Error:', error)
    // Still return 200 to prevent Facebook from retrying
    return NextResponse.json({
      error: 'Internal server error',
      details: (error as Error).message
    })
  }
}
