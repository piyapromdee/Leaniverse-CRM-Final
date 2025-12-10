'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/currency'
import { 
  Loader2, 
  AlertCircle, 
  CreditCard, 
  ExternalLink,
  Calendar,
  Filter
} from 'lucide-react'

interface Transaction {
  id: string
  stripe_payment_intent_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'canceled' | 'processing'
  payment_method_types: string[]
  created_at: string
  product: {
    id: string
    name: string
  } | null
  price: {
    id: string
    type: 'one_time' | 'recurring'
    interval?: string
    interval_count?: number
  } | null
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'succeeded' | 'failed' | 'canceled'>('all')

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/transactions')
      const result = await response.json()

      if (response.ok) {
        setTransactions(result.transactions || [])
      } else {
        setError(result.error || 'Failed to fetch transactions')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => 
    filter === 'all' || transaction.status === filter
  )

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800">Succeeded</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>
      case 'processing':
        return <Badge variant="outline">Processing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: Transaction['price']) => {
    if (!price) return 'N/A'
    
    if (price.type === 'recurring') {
      const interval = price.interval_count === 1 
        ? price.interval 
        : `${price.interval_count} ${price.interval}s`
      return `Subscription (${interval})`
    }
    
    return 'One-time'
  }

  const getStats = () => {
    const succeeded = transactions.filter(t => t.status === 'succeeded')
    const totalRevenue = succeeded.reduce((sum, t) => sum + t.amount, 0)
    const primaryCurrency = transactions[0]?.currency || 'usd'
    
    return {
      total: transactions.length,
      succeeded: succeeded.length,
      failed: transactions.filter(t => t.status === 'failed').length,
      canceled: transactions.filter(t => t.status === 'canceled').length,
      totalRevenue,
      primaryCurrency
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600">View all your payment transactions and their status.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600">View all your payment transactions and their status.</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchTransactions}>
          Try Again
        </Button>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-600">View all your payment transactions and their status.</p>
      </div>

      {/* Statistics Cards */}
      {transactions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue, stats.primaryCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {stats.succeeded} successful transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.succeeded} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.succeeded}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.succeeded / stats.total) * 100).toFixed(1) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <div className="h-4 w-4 bg-red-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.canceled} canceled
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All payment transactions you've made
              </CardDescription>
            </div>
            {transactions.length > 0 && (
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "Your payment transactions will appear here once you make a purchase."
                  : `You don't have any ${filter} transactions.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {transaction.product?.name || 'Product Not Found'}
                        </h3>
                        {getStatusBadge(transaction.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Payment Method: {transaction.payment_method_types.join(', ')}</div>
                        <div>Type: {formatPrice(transaction.price)}</div>
                        <div>Date: {formatDate(transaction.created_at)}</div>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      
                      <div className="flex space-x-2">
                        {transaction.product && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/products/${transaction.product.id}`}>
                              View Product
                            </a>
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(
                            `https://dashboard.stripe.com/payments/${transaction.stripe_payment_intent_id}`,
                            '_blank'
                          )}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}