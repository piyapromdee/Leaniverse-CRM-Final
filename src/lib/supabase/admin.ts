import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for admin operations
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    
    // Use service role to bypass RLS for admin check
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Admin check error:', error)
      return false
    }

    return profile?.role === 'admin'
  } catch (error) {
    console.error('Admin check exception:', error)
    return false
  }
}

// Fetch all users for admin (bypasses RLS)
export async function fetchAllUsers() {
  try {
    const adminClient = createAdminClient()
    
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all users:', error)
      throw error
    }

    return profiles || []
  } catch (error) {
    console.error('Exception fetching all users:', error)
    throw error
  }
}