'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'
import { Package, Loader2 } from 'lucide-react'

/**
 * Products Page Redirect
 *
 * This page redirects to the Product Catalog page which uses localStorage
 * for local product management without requiring Stripe integration.
 *
 * The Product Catalog page supports:
 * - Creating/editing products with local payment instructions
 * - QR Code/Bank Transfer payment details
 * - Category management
 * - CSV export
 */
export default function ProductsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the localStorage-based product catalog
    router.replace('/admin/product-catalog')
  }, [router])

  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Package className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Redirecting to Product Catalog...</p>
        </div>
      </div>
    </AdminLayout>
  )
}

export const dynamic = 'force-dynamic'
