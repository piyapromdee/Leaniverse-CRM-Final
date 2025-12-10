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

// Get current admin user ID
async function getCurrentAdminId() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

// Get email configuration from database
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
  try {
    const config = await getEmailConfig()
    const transporter = await createTransporter()
    
    // Convert plain text body to HTML
    const htmlBody = body.replace(/\n/g, '<br>')
    
    const mailOptions = {
      from: `${config.from_name} <${config.from_email}>`,
      to: to,
      subject: subject,
      text: body, // Plain text version
      html: htmlBody, // HTML version
      replyTo: config.reply_to
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions)
    
    console.log(`✅ Email sent successfully to: ${to}`)
    console.log(`📧 Message ID: ${info.messageId}`)
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    }
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error)
    throw error
  }
}

// Log email activity to database
async function logEmail(
  recipientEmail: string, 
  recipientName: string | undefined, 
  subject: string, 
  body: string, 
  status: 'sent' | 'failed', 
  errorMessage?: string,
  sentBy?: string | null
) {
  try {
    const adminClient = createAdminClient()
    await adminClient
      .from('email_logs')
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject,
        body,
        status,
        error_message: errorMessage,
        sent_by: sentBy
      })
  } catch (error) {
    console.error('Failed to log email:', error)
    // Don't throw here - logging failure shouldn't break email sending
  }
}

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

    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[]
    }

    // Get current admin ID for logging
    const adminId = await getCurrentAdminId()

    // Send emails to all recipients with delay
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      
      try {
        const fullName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
        const recipientName = (recipient.nickname && fullName) 
          ? `${fullName} (${recipient.nickname})` 
          : fullName || recipient.nickname || 'User'
        
        // Personalize the email body with recipient name
        const personalizedBody = body.replace(/\{name\}/g, recipientName)
        
        // Send the email
        await sendEmail(recipient.email, subject, personalizedBody, recipientName)
        
        // Log successful email
        await logEmail(
          recipient.email,
          recipientName,
          subject,
          personalizedBody,
          'sent',
          undefined,
          adminId
        )
        
        results.successful++
        
        // Add delay between emails (except for the last one)
        if (delay > 0 && i < recipients.length - 1) {
          console.log(`⏳ Waiting ${delay}ms before sending next email...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Log failed email
        const failedFullName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
        const failedRecipientName = (recipient.nickname && failedFullName) 
          ? `${failedFullName} (${recipient.nickname})` 
          : failedFullName || recipient.nickname || 'User'
        
        await logEmail(
          recipient.email,
          failedRecipientName,
          subject,
          body.replace(/\{name\}/g, failedRecipientName),
          'failed',
          errorMessage,
          adminId
        )
        
        results.failed++
        results.errors.push({
          email: recipient.email,
          error: errorMessage
        })
      }
    }

    // Log the email sending activity (you might want to store this in a database)
    console.log(`Admin bulk email sent:`, {
      subject,
      recipientCount: recipients.length,
      successful: results.successful,
      failed: results.failed,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${results.successful} emails`,
      results
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}