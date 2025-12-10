import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use regular client for auth
    const supabase = await createClient()
    
    // Use service role client for database queries (bypasses RLS)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('API: User from auth:', { user, userError })
    
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, error: 'Not authenticated' })
    }

    console.log('API: Querying profiles table for user ID:', user.id)

    // Query profile with service role (bypasses RLS) - get all fields for debugging
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('API: Profile query result:', { profile, profileError })
    console.log('API: Raw profile data:', JSON.stringify(profile, null, 2))
    console.log('API: Profile role field:', profile?.role)
    console.log('API: Profile role type:', typeof profile?.role)

    if (profileError) {
      console.error('API: Profile query error:', profileError)
      return NextResponse.json({ isAdmin: false, error: profileError.message })
    }

    // Check if user is disabled
    if (profile?.is_disabled === true) {
      return NextResponse.json({ isAdmin: false, error: 'Account disabled' })
    }

    const isAdmin = profile?.role === 'admin'
    console.log('API: Is admin check:', isAdmin)
    
    return NextResponse.json({ 
      isAdmin,
      role: profile?.role,
      userId: user.id,
      fullProfile: profile // Include full profile for debugging
    })
  } catch (error) {
    console.error('API: Admin check error:', error)
    return NextResponse.json({ isAdmin: false, error: 'Server error' })
  }
}