import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

// GET - Fetch email configuration
export async function GET() {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { data: config, error } = await adminClient
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching email config:', error)
      return NextResponse.json({ error: 'Failed to fetch email configuration' }, { status: 500 })
    }

    // Don't return the password in the response
    if (config) {
      const { smtp_password, ...configWithoutPassword } = config
      return NextResponse.json({ config: configWithoutPassword, hasPassword: !!smtp_password })
    }

    return NextResponse.json({ config: null, hasPassword: false })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update email configuration
export async function POST(request: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      from_email,
      from_name,
      reply_to
    } = await request.json()

    // Validate required fields
    if (!smtp_host || !smtp_port || !smtp_user || !from_email) {
      return NextResponse.json({ 
        error: 'Missing required fields: smtp_host, smtp_port, smtp_user, from_email' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // First, deactivate all existing configs
    await adminClient
      .from('email_config')
      .update({ is_active: false })
      .eq('is_active', true)

    // Create new config
    const configData: any = {
      smtp_host,
      smtp_port: parseInt(smtp_port),
      smtp_secure: !!smtp_secure,
      smtp_user,
      from_email,
      from_name: from_name || 'Admin',
      reply_to: reply_to || from_email,
      is_active: true
    }

    // Only include password if provided
    if (smtp_password) {
      configData.smtp_password = smtp_password
    }

    const { data: config, error } = await adminClient
      .from('email_config')
      .insert(configData)
      .select()
      .single()

    if (error) {
      console.error('Error creating email config:', error)
      return NextResponse.json({ error: 'Failed to save email configuration' }, { status: 500 })
    }

    // Don't return the password in the response
    const { smtp_password: _, ...configWithoutPassword } = config
    return NextResponse.json({ 
      success: true, 
      message: 'Email configuration saved successfully',
      config: configWithoutPassword 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}