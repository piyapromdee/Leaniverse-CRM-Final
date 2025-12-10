'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/currency'
import { 
  Loader2, 
  AlertCircle, 
  CreditCard, 
  Package, 
  DollarSign,
  FileText,
  CheckCircle,
  Users,
  XCircle
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

interface BulkManualTransactionFormProps {
  selectedUserIds: string[]
  userCount: number
  onSuccess: () => void
  onCancel: () => void
}

interface TransactionResult {
  userId: string
  userName: string
  success: boolean
  error?: string
}

export default function BulkManualTransactionForm({ 
  selectedUserIds, 
  userCount, 
  onSuccess, 
  onCancel 
}: BulkManualTransactionFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedPriceId, setSelectedPriceId] = useState('')
  const [status, setStatus] = useState<'succeeded' | 'failed' | 'canceled'>('succeeded')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TransactionResult[]>([])
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

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

    setProcessing(true)
    setError(null)
    setResults([])
    setProgress(0)
    setCurrentStep(0)

    const transactionResults: TransactionResult[] = []

    for (let i = 0; i < selectedUserIds.length; i++) {
      const userId = selectedUserIds[i]
      setCurrentStep(i + 1)
      setProgress(((i + 1) / selectedUserIds.length) * 100)

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
            notes: notes.trim() || `Bulk transaction for ${userCount} users`
          })
        })

        const data = await response.json()

        if (response.ok) {
          transactionResults.push({
            userId,
            userName: data.transaction?.user_name || 'Unknown User',
            success: true
          })
        } else {
          transactionResults.push({
            userId,
            userName: 'Unknown User',
            success: false,
            error: data.error || 'Failed to create transaction'
          })
        }
      } catch {
        transactionResults.push({
          userId,
          userName: 'Unknown User',
          success: false,
          error: 'Network error'
        })
      }

      setResults([...transactionResults])
    }

    setProcessing(false)
    setIsComplete(true)
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

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

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

  if (isComplete) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              {errorCount === 0 ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : successCount > 0 ? (
                <AlertCircle className="h-16 w-16 text-yellow-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bulk Transaction Complete
            </h3>
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">
                <span className="font-medium text-green-600">{successCount} successful</span>
                {errorCount > 0 && (
                  <span>, <span className="font-medium text-red-600">{errorCount} failed</span></span>
                )}
              </p>
              {selectedProduct && status === 'succeeded' && successCount > 0 && (
                <p className="text-sm text-gray-500">
                  {successCount} user{successCount === 1 ? '' : 's'} now have access to {selectedProduct.name}
                </p>
              )}
            </div>
            
            {errorCount > 0 && (
              <div className="text-left max-h-40 overflow-y-auto mb-4">
                <h4 className="font-medium text-red-600 mb-2">Failed Transactions:</h4>
                <div className="space-y-1">
                  {results.filter(r => !r.success).map((result, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {result.userName}: {result.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={onSuccess} className="w-full">
              Close
            </Button>
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
          Bulk Create Manual Transactions
        </CardTitle>
        <CardDescription>
          Create manual product purchase transactions for {userCount} selected user{userCount === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {processing ? (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="font-medium">Creating transactions...</p>
              <p className="text-sm text-gray-600">
                Processing user {currentStep} of {selectedUserIds.length}
              </p>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-gray-600">
              <p>Successfully created: {successCount}</p>
              {errorCount > 0 && <p>Failed: {errorCount}</p>}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Selected Users Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">
                  {userCount} user{userCount === 1 ? '' : 's'} selected
                </span>
              </div>
            </div>

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
                placeholder="Add any notes about this bulk transaction..."
                rows={3}
              />
            </div>

            {/* Transaction Summary */}
            {selectedProduct && selectedPrice && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Bulk Transaction Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span className="font-medium">{userCount}</span>
                  </div>
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
                      <span className="font-medium text-green-600">Will be granted to all users</span>
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
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedProductId || !selectedPriceId || processing}
              >
                Create {userCount} Transaction{userCount === 1 ? '' : 's'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}