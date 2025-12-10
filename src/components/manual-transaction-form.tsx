'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/currency'
import { 
  Loader2, 
  AlertCircle, 
  CreditCard, 
  Package, 
  DollarSign,
  FileText,
  CheckCircle
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string
  short_description?: string
  prices: Price[]
}

interface Price {
  id: string
  unit_amount: number
  currency: string
  type: 'one_time' | 'recurring'
  interval?: string
  interval_count?: number
}

interface ManualTransactionFormProps {
  userId: string
  userName: string
  onSuccess: () => void
  onCancel: () => void
}

export default function ManualTransactionForm({ 
  userId, 
  userName, 
  onSuccess, 
  onCancel 
}: ManualTransactionFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedPriceId, setSelectedPriceId] = useState('')
  const [status, setStatus] = useState<'succeeded' | 'failed' | 'canceled'>('succeeded')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load products and prices
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/admin/transactions/manual')
        const data = await response.json()

        if (response.ok) {
          setProducts(data.products || [])
        } else {
          setError(data.error || 'Failed to load products')
        }
      } catch {
        setError('Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  // Reset price selection when product changes
  useEffect(() => {
    setSelectedPriceId('')
  }, [selectedProductId])

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const selectedPrice = selectedProduct?.prices.find(p => p.id === selectedPriceId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProductId || !selectedPriceId) {
      setError('Please select a product and price')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/transactions/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          productId: selectedProductId,
          priceId: selectedPriceId,
          status,
          notes: notes.trim() || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setError(data.error || 'Failed to create transaction')
      }
    } catch {
      setError('Failed to create transaction')
    } finally {
      setSubmitting(false)
    }
  }

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

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading products...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Created Successfully</h3>
            <p className="text-gray-600">
              {status === 'succeeded' 
                ? `${userName} now has access to ${selectedProduct?.name}`
                : `Transaction created with status: ${status}`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Create Manual Transaction
        </CardTitle>
        <CardDescription>
          Create a manual product purchase transaction for {userName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product" className="flex items-center">
              <Package className="mr-2 h-4 w-4" />
              Product
            </Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <span className="font-medium">{product.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct?.short_description && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedProduct.short_description}
              </p>
            )}
          </div>

          {/* Price Selection */}
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Price
            </Label>
            <Select 
              value={selectedPriceId} 
              onValueChange={setSelectedPriceId}
              disabled={!selectedProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a price" />
              </SelectTrigger>
              <SelectContent>
                {selectedProduct?.prices.map((price) => (
                  <SelectItem key={price.id} value={price.id}>
                    <div className="flex justify-between items-center w-full">
                      <span className="font-medium">{formatPrice(price)}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {price.type === 'recurring' ? 'Subscription' : 'One-time'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Transaction Status</Label>
            <Select value={status} onValueChange={(value: 'succeeded' | 'failed' | 'canceled') => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="succeeded">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Succeeded - Grant access
                  </div>
                </SelectItem>
                <SelectItem value="failed">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    Failed - No access granted
                  </div>
                </SelectItem>
                <SelectItem value="canceled">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                    Canceled - No access granted
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this manual transaction..."
              rows={3}
            />
          </div>

          {/* Transaction Summary */}
          {selectedProduct && selectedPrice && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Transaction Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="font-medium">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">{formatPrice(selectedPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-medium">
                    {selectedPrice.type === 'recurring' ? 'Subscription' : 'One-time Purchase'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-medium ${
                    status === 'succeeded' ? 'text-green-600' : 
                    status === 'failed' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                {status === 'succeeded' && (
                  <div className="flex justify-between">
                    <span>Access:</span>
                    <span className="font-medium text-green-600">Will be granted</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedProductId || !selectedPriceId || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Transaction'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}