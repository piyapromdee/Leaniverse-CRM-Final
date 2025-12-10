'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Target, DollarSign, Trophy, Calendar, BarChart3, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PerformanceMetrics {
  thisMonth: {
    dealsWon: number
    revenue: number
    dealsCreated: number
    conversionRate: number
  }
  lastMonth: {
    dealsWon: number
    revenue: number
    dealsCreated: number
    conversionRate: number
  }
  trends: {
    dealsTrend: 'up' | 'down' | 'same'
    revenueTrend: 'up' | 'down' | 'same'
    conversionTrend: 'up' | 'down' | 'same'
  }
  // Future: targets can be added here
  targets?: {
    monthlyRevenue: number
    monthlyDeals: number
  }
}

const MyPerformanceWidget = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadPerformanceData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Get current month and last month date ranges
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      
      // This month: from 1st to now
      const thisMonthStart = new Date(currentYear, currentMonth, 1)
      const thisMonthEnd = now
      
      // Last month: full month
      const lastMonthStart = new Date(currentYear, currentMonth - 1, 1)
      const lastMonthEnd = new Date(currentYear, currentMonth, 0) // Last day of previous month

      // Query for this month's data - for My Performance, show only user's deals
      const { data: thisMonthDeals, error: thisMonthError } = await supabase
        .from('deals')
        .select('id, stage, value, created_at')
        .eq('user_id', user.id) // Show only current user's deals for My Performance widget
        .gte('created_at', thisMonthStart.toISOString())
        .lte('created_at', thisMonthEnd.toISOString())

      if (thisMonthError) throw thisMonthError

      // Query for last month's data - for My Performance, show only user's deals
      const { data: lastMonthDeals, error: lastMonthError } = await supabase
        .from('deals')
        .select('id, stage, value, created_at')
        .eq('user_id', user.id) // Show only current user's deals for My Performance widget
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString())

      if (lastMonthError) throw lastMonthError

      // Calculate metrics for this month
      const thisMonthWon = (thisMonthDeals || []).filter(d => d.stage === 'won')
      const thisMonthRevenue = thisMonthWon.reduce((sum, d) => sum + (d.value || 0), 0)
      const thisMonthCreated = (thisMonthDeals || []).length
      const thisMonthConversion = thisMonthCreated > 0 ? Math.round((thisMonthWon.length / thisMonthCreated) * 100) : 0

      // Debug logging for My Performance verification
      console.log('📊 My Performance Debug:', {
        userId: user.id,
        thisMonthStart: thisMonthStart.toISOString(),
        thisMonthEnd: thisMonthEnd.toISOString(),
        thisMonthDeals: thisMonthDeals || [],
        thisMonthCreated,
        thisMonthWon: thisMonthWon.length,
        thisMonthRevenue
      })

      // Calculate metrics for last month
      const lastMonthWon = (lastMonthDeals || []).filter(d => d.stage === 'won')
      const lastMonthRevenue = lastMonthWon.reduce((sum, d) => sum + (d.value || 0), 0)
      const lastMonthCreated = (lastMonthDeals || []).length
      const lastMonthConversion = lastMonthCreated > 0 ? Math.round((lastMonthWon.length / lastMonthCreated) * 100) : 0

      // Calculate trends
      const dealsTrend = thisMonthWon.length > lastMonthWon.length ? 'up' : 
                        thisMonthWon.length < lastMonthWon.length ? 'down' : 'same'
      const revenueTrend = thisMonthRevenue > lastMonthRevenue ? 'up' : 
                          thisMonthRevenue < lastMonthRevenue ? 'down' : 'same'
      const conversionTrend = thisMonthConversion > lastMonthConversion ? 'up' : 
                             thisMonthConversion < lastMonthConversion ? 'down' : 'same'

      setMetrics({
        thisMonth: {
          dealsWon: thisMonthWon.length,
          revenue: thisMonthRevenue,
          dealsCreated: thisMonthCreated,
          conversionRate: thisMonthConversion
        },
        lastMonth: {
          dealsWon: lastMonthWon.length,
          revenue: lastMonthRevenue,
          dealsCreated: lastMonthCreated,
          conversionRate: lastMonthConversion
        },
        trends: {
          dealsTrend,
          revenueTrend,
          conversionTrend
        }
      })

    } catch (err: any) {
      console.error('Error loading performance data:', err)
      setError(err.message || 'Failed to load performance data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'same': return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      case 'same': return 'text-gray-600'
    }
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>My Performance - Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadPerformanceData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>My Performance</span>
          </div>
          <button
            onClick={loadPerformanceData}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !metrics ? (
          <div className="text-center py-6">
            <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No performance data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Revenue */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  {getTrendIcon(metrics.trends.revenueTrend)}
                </div>
                <div className="text-2xl font-bold text-blue-800">
                  {formatCurrency(metrics.thisMonth.revenue)}
                </div>
                <p className="text-xs text-blue-700">Revenue</p>
                <p className="text-xs text-gray-600 mt-1">
                  vs {formatCurrency(metrics.lastMonth.revenue)} last month
                </p>
              </div>

              {/* Deals Won */}
              <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  {getTrendIcon(metrics.trends.dealsTrend)}
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {metrics.thisMonth.dealsWon}
                </div>
                <p className="text-xs text-green-700">Deals Won</p>
                <p className="text-xs text-gray-600 mt-1">
                  vs {metrics.lastMonth.dealsWon} last month
                </p>
              </div>

              {/* Conversion Rate */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  {getTrendIcon(metrics.trends.conversionTrend)}
                </div>
                <div className="text-2xl font-bold text-purple-800">
                  {metrics.thisMonth.conversionRate}%
                </div>
                <p className="text-xs text-purple-700">Win Rate</p>
                <p className="text-xs text-gray-600 mt-1">
                  vs {metrics.lastMonth.conversionRate}% last month
                </p>
              </div>

              {/* Deals Created */}
              <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  {metrics.thisMonth.dealsCreated >= metrics.lastMonth.dealsCreated ? 
                    <TrendingUp className="w-4 h-4 text-green-600" /> : 
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div className="text-2xl font-bold text-orange-800">
                  {metrics.thisMonth.dealsCreated}
                </div>
                <p className="text-xs text-orange-700">New Deals Created</p>
                <p className="text-xs text-gray-600 mt-1">
                  vs {metrics.lastMonth.dealsCreated} last month
                </p>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Month Progress</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Days into month:</span>
                  <span className="font-medium">{new Date().getDate()} / {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Monthly activity:</span>
                  <Badge variant="outline" className="text-xs">
                    {metrics.thisMonth.dealsCreated > metrics.lastMonth.dealsCreated ? 'Above average' : 
                     metrics.thisMonth.dealsCreated < metrics.lastMonth.dealsCreated ? 'Below average' : 'On track'}
                  </Badge>
                </div>
                {/* Future: Target progress bars can go here */}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MyPerformanceWidget