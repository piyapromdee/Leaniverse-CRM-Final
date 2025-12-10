import { createClient } from '@/lib/supabase/client'

export class AuthErrorHandler {
  private static instance: AuthErrorHandler
  private errorCount = 0
  private lastErrorTime = 0
  private readonly MAX_ERRORS = 3
  private readonly ERROR_WINDOW = 60000 // 1 minute

  private constructor() {}

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler()
    }
    return AuthErrorHandler.instance
  }

  async handleAuthError(error: any): Promise<boolean> {
    const now = Date.now()
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.ERROR_WINDOW) {
      this.errorCount = 0
    }

    this.errorCount++
    this.lastErrorTime = now

    // If too many errors, sign out user
    if (this.errorCount >= this.MAX_ERRORS) {
      console.error('Too many auth errors, signing out user')
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/auth/sign-in'
      return true
    }

    // Handle specific auth errors
    if (error?.message?.includes('Invalid Refresh Token') || 
        error?.message?.includes('refresh') ||
        error?.message?.includes('JWT expired')) {
      
      console.warn('Auth token error detected, attempting to refresh...')
      
      try {
        const supabase = createClient()
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError.message)
          await supabase.auth.signOut()
          window.location.href = '/auth/sign-in'
          return true
        }
        
        if (session) {
          console.log('Session refreshed successfully')
          this.errorCount = 0 // Reset error count on success
          return false // Don't redirect, continue with refreshed session
        }
      } catch (refreshError) {
        console.error('Exception during session refresh:', refreshError)
      }
    }

    return false
  }

  // Setup global error listeners
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', async (event) => {
      if (event.reason?.message?.includes('Invalid Refresh Token') ||
          event.reason?.message?.includes('refresh') ||
          event.reason?.message?.includes('JWT expired')) {
        
        console.warn('Caught unhandled auth error:', event.reason.message)
        event.preventDefault() // Prevent the error from being logged to console
        
        await this.handleAuthError(event.reason)
      }
    })

    // Handle global errors
    window.addEventListener('error', async (event) => {
      if (event.error?.message?.includes('Invalid Refresh Token') ||
          event.error?.message?.includes('refresh') ||
          event.error?.message?.includes('JWT expired')) {
        
        console.warn('Caught global auth error:', event.error.message)
        await this.handleAuthError(event.error)
      }
    })
  }
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  AuthErrorHandler.getInstance().setupGlobalErrorHandling()
}