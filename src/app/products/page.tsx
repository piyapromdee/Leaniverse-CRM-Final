import { Suspense } from 'react'
import ProductCard from '@/components/product-card'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string
  short_description?: string
  slug?: string
  images: string[]
  features: string[]
  stripe_linked: boolean
  prices: Array<{
    id: string
    unit_amount: number
    currency: string
    type: 'one_time' | 'recurring'
    interval?: string
    interval_count?: number
    active: boolean
    stripe_linked: boolean
  }>
}

async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/public/products`, {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!response.ok) {
      console.warn('Products API not available:', response.statusText)
      return []
    }
    
    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.warn('Error fetching products:', error)
    return []
  }
}

function ProductSkeleton() {
  return (
    <Card className="h-full">
      <div className="aspect-video bg-gray-200 animate-pulse rounded-t-lg" />
      <div className="p-6 space-y-4">
        <div className="h-6 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
        <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 animate-pulse rounded flex-1" />
          <div className="h-10 bg-gray-200 animate-pulse rounded w-24" />
        </div>
      </div>
    </Card>
  )
}

function ProductsGrid() {
  return (
    <Suspense 
      fallback={
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  )
}

async function ProductsContent() {
  const products = await getProducts()

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Available</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              We're working on adding products to our catalog. Please check back soon!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Products</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover our range of products designed to help you succeed. 
          Choose the perfect solution for your needs.
        </p>
      </div>

      {/* Products Grid */}
      <ProductsGrid />
    </div>
  )
}

export const dynamic = 'force-dynamic'