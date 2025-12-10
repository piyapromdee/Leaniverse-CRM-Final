import { notFound } from 'next/navigation'
import ProductDetails from '@/components/product-details'
import { Metadata } from 'next'
import { use } from 'react'

interface Product {
  id: string
  name: string
  description?: string
  short_description?: string
  slug?: string
  images: string[]
  features: string[]
  prices: Array<{
    id: string
    unit_amount: number
    currency: string
    type: 'one_time' | 'recurring'
    interval?: string
    interval_count?: number
  }>
  metadata?: Record<string, any>
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/public/products/${id}`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch product')
    }
    
    const data = await response.json()
    return data.product
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const resolvedParams = await params
  const product = await getProduct(resolvedParams.id)
  
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.'
    }
  }

  return {
    title: `${product.name} - Products`,
    description: product.short_description || product.description || `Purchase ${product.name}`,
    openGraph: {
      title: product.name,
      description: product.short_description || product.description || `Purchase ${product.name}`,
      images: product.images.length > 0 ? [{ url: product.images[0] }] : undefined,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.short_description || product.description || `Purchase ${product.name}`,
      images: product.images.length > 0 ? [product.images[0]] : undefined
    }
  }
}

export default async function ProductPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params
  const product = await getProduct(resolvedParams.id)

  if (!product) {
    notFound()
  }

  return <ProductDetails product={product} />
}

export const dynamic = 'force-dynamic'