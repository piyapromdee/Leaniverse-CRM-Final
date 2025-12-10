'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthErrorHandler } from '@/lib/auth-error-handler'

export function useAuthMonitor() {
  const supabase = createClient()
  const authHandler = AuthErrorHandler.getInstance()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Monitor session health every 5 minutes
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Session check error:', error.message)
          await authHandler.handleAuthError(error)
          return
        }

        if (session?.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000)
          const now = new Date()
          const timeUntilExpiry = expiresAt.getTime() - now.getTime()
          
          // If session expires in less than 5 minutes, try to refresh
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            console.log('Session expiring soon, refreshing...')
            
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.error('Failed to proactively refresh session:', refreshError.message)
              await authHandler.handleAuthError(refreshError)
            } else {
              console.log('Session refreshed proactively')
            }
          }
        }
      } catch (error) {
        console.error('Session monitoring error:', error)
        await authHandler.handleAuthError(error)
      }
    }

    // Initial check
    checkSession()

    // Set up interval
    intervalRef.current = setInterval(checkSession, 5 * 60 * 1000) // Every 5 minutes

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [supabase, authHandler])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])
}