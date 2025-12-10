'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, ArrowRight, Home, Loader2, AlertCircle, UserPlus, Mail, Package, CreditCard, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface PurchaseStatus {
  hasPurchased: boolean
  isNewUser: boolean
  needsLogin: boolean
  customerEmail?: string
  userAccountId?: string
  productId?: string
  userId?: string
  isRecentPurchase?: boolean
  transaction?: {
    id: string
    amount: number
    currency: string
    paymentMethodTypes: string[]
    createdAt: string
    status: string
  }
  product?: {
    id: string
    name: string
    description?: string
    short_description?: string
    images: string[]
  }
  price?: {
    id: string
    type: 'one_time' | 'recurring'
    interval?: string
    interval_count?: number
  }
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('product')
  // Try different parameter names for payment intent
  const paymentIntentId = searchParams.get('payment_intent') || 
                         searchParams.get('payment_intent_id') ||
                         searchParams.get('pi')
  
  // Debug logging (client-side only)
  useEffect(() => {
    console.log('Success page URL params:', {
      product: productId,
      payment_intent: paymentIntentId,
      all_params: Object.fromEntries(searchParams.entries()),
      raw_url: typeof window !== 'undefined' ? window.location.href : 'SSR'
    })
  }, [productId, paymentIntentId, searchParams])
  
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyPurchase = async () => {
      // If no product ID in URL but we have payment intent, try to get product from transaction
      if (!productId && paymentIntentId) {
        try {
          const response = await fetch(`/api/checkout/purchase-status?paymentIntentId=${paymentIntentId}`)
          const result = await response.json()

          if (response.ok && result.productId) {
            // Update URL with product ID we found
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.set('product', result.productId)
            window.history.replaceState({}, '', newUrl)
            
            setPurchaseStatus(result)
            setLoading(false)
            return
          }
        } catch (err) {
          console.error('Error fetching product from payment intent:', err)
        }
      }

      if (!productId) {
        setError('Missing product information')
        setLoading(false)
        return
      }

      try {
        // Check purchase status with account creation info
        const params = new URLSearchParams({
          productId
        })
        
        if (paymentIntentId) {
          params.append('paymentIntentId', paymentIntentId)
        }

        const response = await fetch(`/api/checkout/purchase-status?${params}`)
        const result = await response.json()

        if (response.ok) {
          setPurchaseStatus(result)
        } else {
          setError(result.error || 'Failed to verify purchase')
        }
      } catch (err) {
        setError('Failed to verify purchase status')
      } finally {
        setLoading(false)
      }
    }

    // Add a small delay to allow webhook processing
    const timer = setTimeout(verifyPurchase, 2000)
    return () => clearTimeout(timer)
  }, [productId, paymentIntentId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Loader2 className="h-20 w-20 text-blue-500 mx-auto mb-6 animate-spin" />
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Processing Your Payment
              </h1>
              
              <p className="text-lg text-gray-600 mb-2">
                Please wait while we verify your purchase...
              </p>
              
              <p className="text-gray-500">
                This should only take a few seconds.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-20 w-20 text-orange-500 mx-auto mb-6" />
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Payment Verification Issue
              </h1>
              
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              
              <p className="text-gray-600 mb-8">
                Don't worry - if your payment was successful, you'll receive access shortly. 
                Check your email for confirmation or contact support if you need assistance.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/dashboard/transactions">
                    View Transaction History
                  </Link>
                </Button>
                
                <Button variant="outline" asChild size="lg">
                  <Link href="/dashboard/purchases">
                    View My Purchases
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show success message based on purchase verification
  const isVerified = purchaseStatus?.hasPurchased

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            
            {isVerified ? (
              <>
                <p className="text-lg text-green-600 font-medium mb-6">
                  ✓ Purchase verified and access granted
                </p>
              </>
            ) : (
              <>
                <p className="text-lg text-blue-600 font-medium mb-6">
                  Payment received - Access being processed
                </p>
              </>
            )}

            {/* Product Details - Show regardless of verification status */}
            {purchaseStatus?.product && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Product Details</h3>
                </div>
                
                <div className="flex gap-4">
                  {purchaseStatus.product.images && purchaseStatus.product.images.length > 0 && (
                    <div className="flex-shrink-0">
                      <img
                        src={purchaseStatus.product.images[0]}
                        alt={purchaseStatus.product.name}
                        className="w-20 h-20 object-contain rounded-lg bg-white border"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{purchaseStatus.product.name}</h4>
                    {purchaseStatus.product.short_description && (
                      <p className="text-sm text-gray-600">{purchaseStatus.product.short_description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details - Show regardless of verification status */}
            {purchaseStatus?.transaction && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium text-gray-900">Payment Details</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(purchaseStatus.transaction.amount, purchaseStatus.transaction.currency)}
                      {purchaseStatus.price?.type === 'recurring' && purchaseStatus.price.interval && (
                        <span className="text-sm text-gray-500 ml-1">
                          / {purchaseStatus.price.interval_count === 1 
                            ? purchaseStatus.price.interval 
                            : `${purchaseStatus.price.interval_count} ${purchaseStatus.price.interval}s`}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {(() => {
                        const types = purchaseStatus.transaction.paymentMethodTypes || []
                        // Check if we have a single actual payment method (new format)
                        if (types.length === 1) {
                          return types[0] === 'promptpay' ? 'PromptPay' : 
                                 types[0] === 'card' ? 'Card' : 
                                 types[0]
                        }
                        // Fallback for legacy data with multiple types
                        if (types.includes('promptpay')) return 'PromptPay'
                        if (types.includes('card')) return 'Card'
                        return types[0] || 'Card'
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-mono text-xs text-gray-700">{purchaseStatus.transaction.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(purchaseStatus.transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show account creation info */}
            {purchaseStatus?.isNewUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Account Created!</h3>
                </div>
                <p className="text-blue-800 mb-2">
                  We've automatically created an account for you with the email address you provided.
                </p>
                {purchaseStatus.customerEmail && (
                  <div className="flex items-center gap-1 text-sm text-blue-700">
                    <Mail className="h-4 w-4" />
                    <span>Account: {purchaseStatus.customerEmail}</span>
                  </div>
                )}
                <p className="text-sm text-blue-700 mt-2">
                  You can sign in to access your purchases and manage your account.
                </p>
              </div>
            )}

            {purchaseStatus?.needsLogin && !purchaseStatus?.userId && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  To access your purchase, please sign in with the email address you used during checkout.
                </AlertDescription>
              </Alert>
            )}

            {/* Single navigation button */}
            <div className="flex justify-center">
              {purchaseStatus?.needsLogin && !purchaseStatus?.userId ? (
                <Button asChild size="lg">
                  <Link href="/auth/sign-in">
                    Sign In to Access Purchase
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Loading...</h2>
              <p className="mt-2 text-sm text-gray-600">Verifying your purchase</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'