import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Admin client with service role key
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Check if current user is admin
async function isCurrentUserAdmin() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return profile?.role === 'admin'
  } catch {
    return false
  }
}

// Get current admin ID
async function getCurrentAdminId() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

// Get email configuration
async function getEmailConfig() {
  const adminClient = createAdminClient()
  const { data: config, error } = await adminClient
    .from('email_config')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !config) {
    throw new Error('Email configuration not found. Please configure SMTP settings.')
  }

  return config
}

// Create nodemailer transporter
async function createTransporter() {
  const config = await getEmailConfig()
  
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_port === 465, // true for 465, false for other ports
    auth: {
      user: config.smtp_user,
      pass: config.smtp_password,
    },
    // Additional options for better reliability
    tls: {
      rejectUnauthorized: false // For self-signed certificates
    }
  })
}

// Email sending function using SMTP
async function sendEmail(to: string, subject: string, body: string, recipientName?: string) {
  const transporter = await createTransporter()
  const config = await getEmailConfig()
  
  // Replace {name} placeholder with recipient's name
  const personalizedBody = body.replace(/{name}/g, recipientName || 'there')
  
  const mailOptions = {
    from: `${config.from_name} <${config.from_email}>`,
    to: to,
    subject: subject,
    html: personalizedBody.replace(/\n/g, '<br>'),
    text: personalizedBody,
    replyTo: config.reply_to || config.from_email
  }

  await transporter.sendMail(mailOptions)
}

// Log email activity
async function logEmail(recipientEmail: string, subject: string, body: string, status: 'success' | 'failed', errorMessage?: string, sentBy?: string) {
  try {
    const adminClient = createAdminClient()
    await adminClient
      .from('email_logs')
      .insert({
        recipient_email: recipientEmail,
        subject: subject,
        body: body,
        status: status,
        error_message: errorMessage,
        sent_by: sentBy
      })
  } catch (error) {
    console.error('Failed to log email:', error)
    // Don't throw here - logging failure shouldn't break email sending
  }
}

// Create a text encoder for streaming
const encoder = new TextEncoder()

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userIds, subject, body, recipients, delayBetweenEmails = 0 } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 })
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Email subject is required' }, { status: 400 })
    }

    if (!body || !body.trim()) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 })
    }

    if (!recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: 'Recipients data is required' }, { status: 400 })
    }

    // Validate delay (must be between 0 and 60 seconds)
    const delay = Math.max(0, Math.min(60000, parseInt(delayBetweenEmails) || 0))

    // Get current admin ID for logging
    const adminId = await getCurrentAdminId()

    // Create email campaign record
    const adminClient = createAdminClient()
    const { data: campaign, error: campaignError } = await adminClient
      .from('email_campaigns')
      .insert({
        subject: subject.trim(),
        body: body.trim(),
        total_recipients: recipients.length,
        delay_between_emails: delay,
        status: 'pending',
        sent_by: adminId
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json({ error: 'Failed to create campaign record' }, { status: 500 })
    }

    // Create campaign recipients records
    const campaignRecipients = recipients.map(recipient => {
      const fullName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
      const recipientName = (recipient.nickname && fullName) 
        ? `${fullName} (${recipient.nickname})` 
        : fullName || recipient.nickname || null
      
      return {
        campaign_id: campaign.id,
        recipient_email: recipient.email,
        recipient_name: recipientName,
        status: 'pending' as const
      }
    })

    const { error: recipientsError } = await adminClient
      .from('email_campaign_recipients')
      .insert(campaignRecipients)

    if (recipientsError) {
      console.error('Error creating campaign recipients:', recipientsError)
      // Continue anyway - the campaign exists, we'll track what we can
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const results = {
          total: recipients.length,
          successful: 0,
          failed: 0,
          errors: [] as { email: string; error: string }[]
        }

        // Update campaign status to 'sending' and set started_at
        await adminClient
          .from('email_campaigns')
          .update({ 
            status: 'sending',
            started_at: new Date().toISOString()
          })
          .eq('id', campaign.id)

        // Send initial progress
        const sendProgress = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        sendProgress({
          type: 'progress',
          current: 0,
          total: recipients.length,
          successful: 0,
          failed: 0,
          status: 'starting'
        })

        // Send emails to all recipients with delay
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i]
          const fullName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
          const recipientName = (recipient.nickname && fullName) 
            ? `${fullName} (${recipient.nickname})` 
            : fullName || recipient.nickname || 'User'
          
          try {
            // Send progress update before sending email
            sendProgress({
              type: 'progress',
              current: i + 1,
              total: recipients.length,
              successful: results.successful,
              failed: results.failed,
              status: 'sending',
              currentRecipient: recipient.email
            })

            // Send the email
            await sendEmail(recipient.email, subject.trim(), body.trim(), recipientName)
            
            // Log successful email
            await logEmail(recipient.email, subject.trim(), body.trim(), 'success', undefined, adminId || undefined)
            
            // Update campaign recipient status
            await adminClient
              .from('email_campaign_recipients')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('campaign_id', campaign.id)
              .eq('recipient_email', recipient.email)
            
            results.successful++
            
            // Send success update
            sendProgress({
              type: 'progress',
              current: i + 1,
              total: recipients.length,
              successful: results.successful,
              failed: results.failed,
              status: 'sent',
              currentRecipient: recipient.email
            })
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`Failed to send email to ${recipient.email}:`, errorMessage)
            
            // Log failed email
            await logEmail(recipient.email, subject.trim(), body.trim(), 'failed', errorMessage, adminId || undefined)
            
            // Update campaign recipient status
            await adminClient
              .from('email_campaign_recipients')
              .update({ 
                status: 'failed',
                error_message: errorMessage
              })
              .eq('campaign_id', campaign.id)
              .eq('recipient_email', recipient.email)
            
            results.failed++
            results.errors.push({
              email: recipient.email,
              error: errorMessage
            })

            // Send error update
            sendProgress({
              type: 'progress',
              current: i + 1,
              total: recipients.length,
              successful: results.successful,
              failed: results.failed,
              status: 'error',
              currentRecipient: recipient.email,
              error: errorMessage
            })
          }

          // Add delay between emails if specified (except for last email)
          if (delay > 0 && i < recipients.length - 1) {
            sendProgress({
              type: 'progress',
              current: i + 1,
              total: recipients.length,
              successful: results.successful,
              failed: results.failed,
              status: 'waiting',
              waitTime: delay
            })
            
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }

        // Update campaign with final results
        await adminClient
          .from('email_campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            successful_count: results.successful,
            failed_count: results.failed
          })
          .eq('id', campaign.id)

        // Send final results
        sendProgress({
          type: 'complete',
          results: results
        })

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in email sending:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 })
  }
}