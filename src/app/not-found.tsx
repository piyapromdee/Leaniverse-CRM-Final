import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Page Not Found</h2>
        <p className="mb-6 text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link href="/dashboard">
          <Button className="bg-teal-600 hover:bg-teal-700">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}