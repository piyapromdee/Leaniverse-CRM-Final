'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '@/components/checkout-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, AlertCircle, CreditCard, Check } from 'lucide-react'
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

interface ProductData {
  id: string
  name: string
  description?: string
  short_description?: string
  images?: string[]
  prices: Price[]
  stripe_linked: boolean
}

interface CheckoutData {
  clientSecret: string
  product: {
    id: string
    name: string
    description?: string
  }
  price: {
    id: string
    amount: number
    currency: string
    type: 'one_time' | 'recurring'
    interval?: string
  }
}

export default function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const priceId = searchParams.get('priceId')
  
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(priceId)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingSession, setCreatingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripe, setStripe] = useState<any>(null)

  // Initialize Stripe when component mounts
  useEffect(() => {
    console.log('Initializing Stripe...')
    
    const initStripe = async () => {
      // Import loadStripe dynamically to avoid SSR issues
      const { loadStripe } = await import('@stripe/stripe-js')
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      
      if (!publishableKey) {
        console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
        setError('Payment system configuration error')
        return
      }

      console.log('Loading Stripe with key:', publishableKey.substring(0, 12) + '...')
      
      try {
        const stripeInstance = await loadStripe(publishableKey)
        console.log('Stripe loaded successfully:', !!stripeInstance)
        
        if (stripeInstance) {
          setStripe(stripeInstance)
          console.log('Stripe instance set successfully')
        } else {
          console.error('Failed to load Stripe - loadStripe returned null')
          setError('Failed to load payment system')
        }
      } catch (error) {
        console.error('Error loading Stripe:', error)
        setError('Failed to load payment system')
      }
    }

    initStripe()
  }, [])

  // Fetch product data with all prices
  useEffect(() => {
    async function fetchProductData() {
      try {
        const response = await fetch(`/api/products/${resolvedParams.id}`)
        const result = await response.json()

        if (response.ok) {
          const product = result.product
          setProductData(product)
          
          // Auto-select first active price if no priceId in URL
          if (!selectedPriceId && product.prices?.length > 0) {
            const firstActivePrice = product.prices.find((p: Price) => p.active)
            if (firstActivePrice) {
              setSelectedPriceId(firstActivePrice.id)
            }
          }
        } else {
          setError(result.error || 'Failed to load product')
        }
      } catch (err) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProductData()
  }, [resolvedParams.id, selectedPriceId])

  // Create checkout session when price is selected
  useEffect(() => {
    async function createCheckoutSession() {
      if (!selectedPriceId || !productData) return

      setCreatingSession(true)
      setError(null)

      try {
        const response = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            productId: resolvedParams.id,
            priceId: selectedPriceId
          })
        })
        
        const result = await response.json()

        if (response.ok) {
          setCheckoutData(result)
        } else {
          setError(result.error || 'Failed to create checkout session')
        }
      } catch (err) {
        setError('An unexpected error occurred')
      } finally {
        setCreatingSession(false)
      }
    }

    createCheckoutSession()
  }, [resolvedParams.id, selectedPriceId, productData])

  // Helper functions
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

  const handlePriceSelection = (priceId: string) => {
    setSelectedPriceId(priceId)
    setCheckoutData(null) // Reset checkout data to trigger new session creation
    
    // Update URL without page reload
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('priceId', priceId)
    router.replace(newUrl.pathname + newUrl.search)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Setting up your checkout...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Checkout Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button asChild>
                <Link href="/products">
                  Return to Products
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!checkoutData) {
    return null
  }

  // Show unlinked product message
  if (productData && !productData.stripe_linked) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={`/products/${resolvedParams.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Product
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Temporarily Unavailable</h2>
              <p className="text-gray-600 mb-6">
                This product is currently not available for purchase. Please check back later.
              </p>
              <Button asChild>
                <Link href="/products">
                  Browse Other Products
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/products/${resolvedParams.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Product
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-600">Complete your purchase securely</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pricing Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Choose Your Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productData && productData.prices.length > 0 ? (
                <div className="space-y-3">
                  {productData.prices
                    .filter(price => price.active && price.stripe_linked)
                    .map((price) => (
                      <div
                        key={price.id}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPriceId === price.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePriceSelection(price.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedPriceId === price.id
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedPriceId === price.id && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">
                                {formatPrice(price)}
                              </div>
                              <Badge variant={price.type === 'recurring' ? 'default' : 'secondary'}>
                                {price.type === 'recurring' ? 'Subscription' : 'One-time'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No pricing options available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Summary */}
          {productData && (
            <Card>
              <CardHeader>
                <CardTitle>{productData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {productData.short_description && (
                  <p className="text-gray-600 mb-4">{productData.short_description}</p>
                )}
                {productData.description && (
                  <p className="text-sm text-gray-500 mb-4">{productData.description}</p>
                )}
                
                {/* Product Image */}
                {productData.images && productData.images.length > 0 && (
                  <div className="mt-4">
                    <img
                      src={productData.images[0]}
                      alt={productData.name}
                      className="w-full max-w-xs h-auto max-h-64 object-contain rounded-lg shadow-sm bg-gray-50"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Checkout Form */}
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {creatingSession ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Setting up payment...</p>
                </div>
              </CardContent>
            </Card>
          ) : checkoutData?.clientSecret && stripe ? (
            <Elements 
              stripe={stripe} 
              options={{ 
                clientSecret: checkoutData.clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#000000',
                  }
                }
              }}
            >
              <CheckoutForm 
                product={checkoutData.product}
                price={checkoutData.price}
                clientSecret={checkoutData.clientSecret}
              />
            </Elements>
          ) : selectedPriceId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a pricing option to continue</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'