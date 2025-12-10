'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Dashboard Error</h2>
        <p className="mb-6 text-gray-600">
          Something went wrong loading the dashboard. Please try again.
        </p>
        <div className="space-x-4">
          <Button onClick={reset} className="bg-teal-600 hover:bg-teal-700">
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}