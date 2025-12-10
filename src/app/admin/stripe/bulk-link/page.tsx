'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  AlertCircle, 
  Package, 
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  X,
  Plus,
  RefreshCw
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string
  priceCount: number
}

interface SuggestedMatch {
  stripeProductId: string
  name: string
  description?: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
}

interface ProductSuggestion {
  product: Product
  suggestedMatches: SuggestedMatch[]
  recommendation: 'auto-link' | 'review-suggested' | 'create-new'
}

interface BulkLinkStats {
  totalUnlinkedProducts: number
  totalStripeProducts: number
  highConfidenceMatches: number
  suggestedMatches: number
  createNewRecommended: number
}

export default function BulkLinkPage() {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [stats, setStats] = useState<BulkLinkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selections, setSelections] = useState<Record<string, { action: 'link' | 'create' | 'skip', stripeProductId?: string }>>({})

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/user/products/bulk-link')
      const result = await response.json()

      if (response.ok) {
        setSuggestions(result.suggestions || [])
        setStats(result.stats || null)
        
        // Initialize selections based on recommendations
        const initialSelections: Record<string, { action: 'link' | 'create' | 'skip', stripeProductId?: string }> = {}
        result.suggestions.forEach((suggestion: ProductSuggestion) => {
          if (suggestion.recommendation === 'auto-link' && suggestion.suggestedMatches.length > 0) {
            initialSelections[suggestion.product.id] = {
              action: 'link',
              stripeProductId: suggestion.suggestedMatches[0].stripeProductId
            }
          } else if (suggestion.recommendation === 'create-new') {
            initialSelections[suggestion.product.id] = { action: 'create' }
          } else {
            initialSelections[suggestion.product.id] = { action: 'skip' }
          }
        })
        setSelections(initialSelections)
      } else {
        setError(result.error || 'Failed to fetch suggestions')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (productId: string, action: 'link' | 'create' | 'skip', stripeProductId?: string) => {
    setSelections(prev => ({
      ...prev,
      [productId]: { action, stripeProductId }
    }))
  }

  const handleBulkLink = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const mappings = Object.entries(selections).map(([productId, selection]) => ({
        productId,
        action: selection.action,
        stripeProductId: selection.stripeProductId
      }))

      const response = await fetch('/api/user/products/bulk-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      })
      
      const result = await response.json()

      if (response.ok) {
        setSuccess(result.summary.message || 'Bulk linking completed successfully')
        // Refresh suggestions after successful bulk linking
        await fetchSuggestions()
      } else {
        setError(result.error || 'Failed to execute bulk linking')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error executing bulk link:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'auto-link': return 'text-green-600'
      case 'review-suggested': return 'text-yellow-600'
      case 'create-new': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Analyzing products for bulk linking...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Link unlinked products to Stripe in bulk</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchSuggestions} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleBulkLink} 
              disabled={processing || suggestions.length === 0}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Execute Bulk Link
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{stats.totalUnlinkedProducts}</div>
                  <div className="text-sm text-gray-600">Unlinked Products</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalStripeProducts}</div>
                  <div className="text-sm text-gray-600">Stripe Products</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.highConfidenceMatches}</div>
                  <div className="text-sm text-gray-600">High Confidence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.suggestedMatches}</div>
                  <div className="text-sm text-gray-600">Review Suggested</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.createNewRecommended}</div>
                  <div className="text-sm text-gray-600">Create New</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {(error || success) && (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Product Suggestions */}
        {suggestions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Products Linked</h3>
                <p className="text-gray-600">
                  All your products are already linked to Stripe. Great job!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.product.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">{suggestion.product.name}</CardTitle>
                        <CardDescription>
                          {suggestion.product.description} • {suggestion.product.priceCount} prices
                        </CardDescription>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getRecommendationColor(suggestion.recommendation)}
                    >
                      {suggestion.recommendation === 'auto-link' && 'Auto-link recommended'}
                      {suggestion.recommendation === 'review-suggested' && 'Review suggested'}
                      {suggestion.recommendation === 'create-new' && 'Create new recommended'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Action Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Action</label>
                      <div className="flex gap-2">
                        <Button
                          variant={selections[suggestion.product.id]?.action === 'skip' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSelectionChange(suggestion.product.id, 'skip')}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Skip
                        </Button>
                        <Button
                          variant={selections[suggestion.product.id]?.action === 'create' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSelectionChange(suggestion.product.id, 'create')}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create New
                        </Button>
                        {suggestion.suggestedMatches.length > 0 && (
                          <Button
                            variant={selections[suggestion.product.id]?.action === 'link' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSelectionChange(
                              suggestion.product.id, 
                              'link', 
                              suggestion.suggestedMatches[0].stripeProductId
                            )}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Link to Match
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Suggested Matches */}
                    {suggestion.suggestedMatches.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Suggested Matches</label>
                        <div className="space-y-2">
                          {suggestion.suggestedMatches.map((match) => (
                            <div 
                              key={match.stripeProductId}
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                selections[suggestion.product.id]?.stripeProductId === match.stripeProductId
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleSelectionChange(suggestion.product.id, 'link', match.stripeProductId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">{match.name}</div>
                                  {match.description && (
                                    <div className="text-sm text-gray-600">{match.description}</div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={getConfidenceBadgeVariant(match.confidence)}>
                                    {match.similarity}% match
                                  </Badge>
                                  <Badge variant="outline">
                                    {match.confidence}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}