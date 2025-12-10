import { createBrowserClient } from '@supabase/ssr'

// Cached client to avoid creating multiple instances
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return cached client if available
  if (_browserClient) return _browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build/prerender, env vars might not be available
  // Return a placeholder that will be replaced at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    // Check if we're in browser (runtime) vs server (build time)
    if (typeof window !== 'undefined') {
      throw new Error('Supabase environment variables are not set')
    }
    // During SSR/prerender, return a dummy that won't be used
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  _browserClient = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )
  return _browserClient
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