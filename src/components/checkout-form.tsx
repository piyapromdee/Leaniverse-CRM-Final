'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, AlertCircle, User, Mail } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface CheckoutFormProps {
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
  clientSecret: string
}

export default function CheckoutForm({ product, price, clientSecret }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Customer information state
  const [customerData, setCustomerData] = useState({
    email: '',
    firstName: '',
    lastName: ''
  })
  const [customerDataErrors, setCustomerDataErrors] = useState<Record<string, string>>({})
  
  // Extract payment intent ID from client secret
  const getPaymentIntentId = (clientSecret: string) => {
    if (!clientSecret) return null
    // Client secret format: pi_xxx_secret_xxx, we want the pi_xxx part
    const parts = clientSecret.split('_secret_')
    return parts[0] || null
  }

  const formatPrice = (amount: number, currency: string, type: string, interval?: string) => {
    const formatted = formatCurrency(amount, currency)
    
    if (type === 'recurring' && interval) {
      return `${formatted} / ${interval}`
    }
    
    return formatted
  }

  const getCountryFromCurrency = (currency: string): string => {
    const currencyToCountry: Record<string, string> = {
      'usd': 'US',
      'eur': 'DE', // Default to Germany for EUR
      'gbp': 'GB',
      'thb': 'TH'
    }
    return currencyToCountry[currency.toLowerCase()] || 'US'
  }

  const validateCustomerData = () => {
    const errors: Record<string, string> = {}
    
    if (!customerData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!customerData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    
    if (!customerData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }
    
    setCustomerDataErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCustomerDataChange = (field: keyof typeof customerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }))
    // Clear field-specific error when user starts typing
    if (customerDataErrors[field]) {
      setCustomerDataErrors(prev => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      return
    }

    // Validate customer data first
    if (!validateCustomerData()) {
      setError('Please fill in all required fields correctly.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      
      if (submitError) {
        setError(submitError.message || 'Payment failed')
        setLoading(false)
        return
      }

      // Update payment intent with customer data before confirmation
      const paymentIntentId = getPaymentIntentId(clientSecret)
      
      if (paymentIntentId) {
        try {
          const updateResponse = await fetch('/api/checkout/update-customer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId,
              customerData
            })
          })

          if (!updateResponse.ok) {
            console.warn('Failed to update customer data, but continuing with payment')
          }
        } catch (updateError) {
          console.warn('Error updating customer data:', updateError)
          // Continue with payment even if customer update fails
        }
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?product=${product.id}`,
          shipping: {
            name: `${customerData.firstName} ${customerData.lastName}`.trim(),
            address: {
              line1: '', // Can be added later if needed
              city: '',
              country: '',
              postal_code: ''
            }
          },
          receipt_email: customerData.email,
          // Store customer data in payment method metadata
          payment_method_data: {
            billing_details: {
              name: `${customerData.firstName} ${customerData.lastName}`.trim(),
              email: customerData.email,
              address: {
                country: getCountryFromCurrency(price.currency),
                postal_code: ''
              }
            }
          }
        },
        redirect: 'if_required'
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
      } else {
        setSuccess(true)
        // Redirect to success page after a short delay with payment intent
        setTimeout(() => {
          const paymentIntentId = paymentIntent?.id || ''
          window.location.href = `/checkout/success?product=${product.id}&payment_intent=${paymentIntentId}`
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your purchase of {product.name}.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the success page...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600">{product.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatPrice(price.amount, price.currency, price.type, price.interval)}
                </div>
                <div className="text-sm text-gray-500">
                  {price.type === 'recurring' ? 'Subscription' : 'One-time payment'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={customerData.firstName}
                onChange={(e) => handleCustomerDataChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                className={customerDataErrors.firstName ? 'border-red-500' : ''}
              />
              {customerDataErrors.firstName && (
                <p className="text-sm text-red-500">{customerDataErrors.firstName}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                value={customerData.lastName}
                onChange={(e) => handleCustomerDataChange('lastName', e.target.value)}
                placeholder="Enter your last name"
                className={customerDataErrors.lastName ? 'border-red-500' : ''}
              />
              {customerDataErrors.lastName && (
                <p className="text-sm text-red-500">{customerDataErrors.lastName}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={customerData.email}
              onChange={(e) => handleCustomerDataChange('email', e.target.value)}
              placeholder="Enter your email address"
              className={customerDataErrors.email ? 'border-red-500' : ''}
            />
            {customerDataErrors.email && (
              <p className="text-sm text-red-500">{customerDataErrors.email}</p>
            )}
            <p className="text-xs text-gray-500">
              We'll send your receipt and product access information to this email.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <PaymentElement 
            options={{
              layout: 'tabs',
              fields: {
                billingDetails: {
                  email: 'never',
                  address: {
                    country: 'never',
                    postalCode: 'never'
                  }
                }
              }
            }}
            onLoadError={(error) => {
              console.error('PaymentElement load error:', error)
              setError('Failed to load payment options. Please refresh and try again.')
            }}
            onLoaderStart={() => {
              console.log('PaymentElement loader started')
            }}
            onReady={() => {
              console.log('PaymentElement ready')
            }}
          />

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={!stripe || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay {formatPrice(price.amount, price.currency, price.type, price.interval)}
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your payment information is secure and encrypted.
          </p>
        </CardContent>
      </Card>
    </form>
  )
}