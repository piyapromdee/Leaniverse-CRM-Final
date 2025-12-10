'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Something went wrong!</h2>
        <p className="mb-6 text-gray-600">
          An unexpected error has occurred. Please try again.
        </p>
        <Button onClick={reset} className="bg-teal-600 hover:bg-teal-700">
          Try again
        </Button>
      </div>
    </div>
  )
}