import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

// Check if current user is admin and not disabled
export async function getCurrentUser() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { user: null, isAdmin: false, isDisabled: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, is_disabled')
      .eq('id', user.id)
      .single()
    
    const isDisabled = profile?.is_disabled === true
    const isAdmin = profile?.role === 'admin'
    
    return { 
      user, 
      isAdmin, 
      isDisabled,
      profile,
      error: null
    }
  } catch (error) {
    return { user: null, isAdmin: false, isDisabled: false, error: 'Authentication error' }
  }
}

// Check if user is admin and not disabled (for API routes)
export async function requireAdmin() {
  const { user, isAdmin, isDisabled, error } = await getCurrentUser()
  
  if (error || !user) {
    return { authorized: false, user: null, error: 'Not authenticated' }
  }
  
  if (isDisabled) {
    return { authorized: false, user: null, error: 'Account disabled' }
  }
  
  if (!isAdmin) {
    return { authorized: false, user: null, error: 'Admin access required' }
  }
  
  return { authorized: true, user, error: null }
}