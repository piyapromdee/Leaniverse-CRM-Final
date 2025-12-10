import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/currency'
import { Check, ArrowLeft, CreditCard } from 'lucide-react'

interface Price {
  id: string
  unit_amount: number
  currency: string
  type: 'one_time' | 'recurring'
  interval?: string
  interval_count?: number
}

interface Product {
  id: string
  name: string
  description?: string
  short_description?: string
  slug?: string
  images: string[]
  features: string[]
  prices: Price[]
  metadata?: Record<string, any>
}

interface ProductDetailsProps {
  product: Product
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const formatPrice = (price: Price) => {
    const formatted = formatCurrency(price.unit_amount, price.currency)
    
    if (price.type === 'recurring') {
      const interval = price.interval_count === 1 
        ? price.interval 
        : `${price.interval_count} ${price.interval}s`
      return `${formatted} / ${interval}`
    }
    
    return formatted
  }

  const productUrl = product.slug ? `/products/${product.slug}` : `/products/${product.id}`

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          {product.images.length > 0 ? (
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <CreditCard className="mx-auto h-16 w-16 mb-4" />
                <p>Product Image</p>
              </div>
            </div>
          )}

          {/* Additional Images */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((image, index) => (
                <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
                  <img
                    src={image}
                    alt={`${product.name} ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            {product.short_description && (
              <p className="text-xl text-gray-600">{product.short_description}</p>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing</h3>
            <div className="space-y-2">
              {product.prices.map((price) => (
                <Card key={price.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {formatPrice(price)}
                        </div>
                        <Badge variant={price.type === 'recurring' ? 'default' : 'secondary'}>
                          {price.type === 'recurring' ? 'Subscription' : 'One-time'}
                        </Badge>
                      </div>
                      <Button asChild size="lg">
                        <Link href={`/products/${product.id}/checkout?priceId=${price.id}`}>
                          Buy Now
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Features */}
          {product.features.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What's Included</h3>
              <div className="space-y-2">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Description */}
          {product.description && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Description</h3>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}