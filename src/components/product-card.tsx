import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'

interface Price {
  id: string
  unit_amount: number
  currency: string
  type: 'one_time' | 'recurring'
  interval?: string
  interval_count?: number
  active: boolean
  stripe_linked: boolean
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
  stripe_linked: boolean
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const productUrl = product.slug ? `/products/${product.slug}` : `/products/${product.id}`
  
  // Filter to only show active and linked prices
  const availablePrices = product.prices.filter(p => p.active && p.stripe_linked)
  const primaryPrice = availablePrices.length > 0 ? availablePrices[0] : null

  const formatPrice = (price: Price) => {
    if (!price || !price.currency || price.unit_amount === undefined || price.unit_amount === null) {
      return 'Price not available'
    }
    
    const formatted = formatCurrency(price.unit_amount, price.currency)
    
    if (price.type === 'recurring') {
      const interval = price.interval_count === 1 
        ? price.interval 
        : `${price.interval_count} ${price.interval}s`
      return `${formatted} / ${interval}`
    }
    
    return formatted
  }

  const getPriceDisplay = () => {
    if (availablePrices.length === 0) {
      return product.stripe_linked ? 'Contact for pricing' : 'Temporarily unavailable'
    }
    
    if (availablePrices.length === 1) {
      return formatPrice(availablePrices[0])
    }
    
    // Multiple prices - show range
    const amounts = availablePrices.map(p => p.unit_amount).sort((a, b) => a - b)
    const minFormatted = formatCurrency(amounts[0], availablePrices[0].currency)
    const maxFormatted = formatCurrency(amounts[amounts.length - 1], availablePrices[0].currency)
    
    return `${minFormatted} - ${maxFormatted}`
  }

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Product Image */}
      {product.images.length > 0 && (
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader className="flex-grow">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
          <div className="ml-2 flex flex-col items-end gap-1">
            <Badge variant={availablePrices.length > 0 ? "secondary" : "outline"} className="text-sm">
              {getPriceDisplay()}
            </Badge>
            {availablePrices.length > 1 && (
              <Badge variant="outline" className="text-xs">
                {availablePrices.length} options
              </Badge>
            )}
          </div>
        </div>
        
        {product.short_description && (
          <CardDescription className="line-clamp-3">
            {product.short_description}
          </CardDescription>
        )}

        {/* Features Preview */}
        {product.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {product.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.features.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={productUrl}>
              View Details
            </Link>
          </Button>
          
          {availablePrices.length > 0 ? (
            <Button asChild variant="outline">
              <Link href={`/products/${product.id}/checkout`}>
                Buy Now
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              {product.stripe_linked ? 'Contact Us' : 'Unavailable'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}