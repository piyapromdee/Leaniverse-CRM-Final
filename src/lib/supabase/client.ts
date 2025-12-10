import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )
}

// Helper function to safely get user with error handling
export async function getUser() {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.warn('Auth error:', error.message)
      
      // If refresh token error, try to refresh session
      if (error.message.includes('refresh') || error.message.includes('Invalid Refresh Token')) {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError.message)
          // Sign out user if refresh fails
          await supabase.auth.signOut()
          return { user: null, error: refreshError, needsSignIn: true }
        }
        
        return { user: session?.user || null, error: null, needsSignIn: false }
      }
      
      return { user: null, error, needsSignIn: true }
    }
    
    return { user, error: null, needsSignIn: false }
  } catch (err) {
    console.error('Unexpected auth error:', err)
    return { user: null, error: err, needsSignIn: true }
  }
}