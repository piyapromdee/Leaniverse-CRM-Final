// Helper function to get user's organization ID for multi-tenancy
import { createClient } from '@/lib/supabase/server'

export async function getUserOrgId() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized', orgId: null, userId: null }
  }

  // Get user's profile with org_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError)
    return { error: 'Profile not found', orgId: null, userId: user.id }
  }

  // TEMPORARY: Disable multi-tenancy filtering to focus on single tenant (Dummi & Co)
  // Return null orgId to disable filtering in APIs
  return { 
    error: null, 
    orgId: null, // Temporarily disabled
    userId: user.id,
    role: profile.role 
  }
}