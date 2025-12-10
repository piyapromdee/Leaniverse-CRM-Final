import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        debug: 'auth_failed',
        error: authError?.message || 'No user found',
        authenticated: false
      })
    }

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({
        debug: 'profile_error',
        error: profileError.message,
        user_id: user.id,
        authenticated: true
      })
    }

    // Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('system_settings')
      .select('count')
      .limit(1)

    return NextResponse.json({
      debug: 'success',
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      is_admin: profile?.role === 'admin',
      table_exists: !tableError,
      table_error: tableError?.message
    })
  } catch (error) {
    return NextResponse.json({ 
      debug: 'catch_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}