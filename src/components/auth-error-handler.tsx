'use client'

import { useEffect } from 'react'
import { AuthErrorHandler } from '@/lib/auth-error-handler'
import { useAuthMonitor } from '@/hooks/use-auth-monitor'

export default function AuthErrorHandlerComponent() {
  // Initialize global error handling
  useEffect(() => {
    const handler = AuthErrorHandler.getInstance()
    handler.setupGlobalErrorHandling()
  }, [])

  // Use auth monitoring hook
  useAuthMonitor()

  // This component doesn't render anything visible
  return null
}