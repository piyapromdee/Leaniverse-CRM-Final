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

export async function POST() {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get email configuration
    const adminClient = createAdminClient()
    const { data: config, error } = await adminClient
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error || !config) {
      return NextResponse.json({ 
        error: 'Email configuration not found. Please configure SMTP settings first.' 
      }, { status: 400 })
    }

    // Create transporter and test connection
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Verify connection
    await transporter.verify()

    return NextResponse.json({
      success: true,
      message: 'SMTP connection successful! Email configuration is working.',
      config: {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        from: `${config.from_name} <${config.from_email}>`
      }
    })

  } catch (error) {
    console.error('SMTP test error:', error)
    return NextResponse.json({ 
      error: `SMTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: 'Please check your SMTP configuration and try again.'
    }, { status: 500 })
  }
}