import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { subject, body } = await request.json()

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Email subject is required' }, { status: 400 })
    }

    if (!body || !body.trim()) {
      return NextResponse.json({ error: 'Email body is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch user profile to get email and name
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is disabled
    if (profile.is_disabled) {
      return NextResponse.json({ error: 'Cannot send email to disabled user' }, { status: 400 })
    }

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    const recipientName = (profile.nickname && fullName) 
      ? `${fullName} (${profile.nickname})` 
      : fullName || profile.nickname || 'User'
    const recipientEmail = profile.email

    // Get current admin ID for logging
    const adminId = await getCurrentAdminId()

    try {
      // Personalize the email body with recipient name
      const personalizedBody = body.replace(/\{name\}/g, recipientName)
      
      // Send the email
      await sendEmail(recipientEmail, subject, personalizedBody, recipientName)
      
      // Log successful email
      await logEmail(
        recipientEmail,
        recipientName,
        subject,
        personalizedBody,
        'sent',
        undefined,
        adminId
      )

      return NextResponse.json({
        success: true,
        message: `Email sent successfully to ${recipientName} (${recipientEmail})`
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Log failed email
      await logEmail(
        recipientEmail,
        recipientName,
        subject,
        body.replace(/\{name\}/g, recipientName),
        'failed',
        errorMessage,
        adminId
      )

      return NextResponse.json({ 
        error: `Failed to send email: ${errorMessage}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}