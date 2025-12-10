'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Calendar, Wallet, Target, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CommissionData {
  thisMonth: {
    totalRevenue: number
    commission: number
    dealsCount: number
  }
  thisQuarter: {
    totalRevenue: number
    commission: number
    dealsCount: number
  }
  thisYear: {
    totalRevenue: number
    commission: number
    dealsCount: number
  }
  commissionRate: number // Default rate, can be made configurable later
}

const MyCommissionWidget = () => {
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Default commission rate - can be made configurable per user later
  const DEFAULT_COMMISSION_RATE = 5 // 5% of deal value

  const loadCommissionData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      const currentQuarter = Math.floor(currentMonth / 3)

      // This month
      const thisMonthStart = new Date(currentYear, currentMonth, 1)
      
      // This quarter
      const thisQuarterStart = new Date(currentYear, currentQuarter * 3, 1)
      
      // This year
      const thisYearStart = new Date(currentYear, 0, 1)

      // Query for won deals in different periods
      const [monthData, quarterData, yearData] = await Promise.all([
        // This month
        supabase
          .from('deals')
          .select('id, value, updated_at')
          .eq('user_id', user.id)
          .eq('stage', 'won')
          .gte('updated_at', thisMonthStart.toISOString()),
        
        // This quarter
        supabase
          .from('deals')
          .select('id, value, updated_at')
          .eq('user_id', user.id)
          .eq('stage', 'won')
          .gte('updated_at', thisQuarterStart.toISOString()),
        
        // This year
        supabase
          .from('deals')
          .select('id, value, updated_at')
          .eq('user_id', user.id)
          .eq('stage', 'won')
          .gte('updated_at', thisYearStart.toISOString())
      ])

      if (monthData.error) throw monthData.error
      if (quarterData.error) throw quarterData.error
      if (yearData.error) throw yearData.error

      // Calculate commission for each period
      const calculatePeriodMetrics = (deals: any[]) => {
        const totalRevenue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0)
        const commission = totalRevenue * (DEFAULT_COMMISSION_RATE / 100)
        return {
          totalRevenue,
          commission,
          dealsCount: deals.length
        }
      }

      setCommissionData({
        thisMonth: calculatePeriodMetrics(monthData.data || []),
        thisQuarter: calculatePeriodMetrics(quarterData.data || []),
        thisYear: calculatePeriodMetrics(yearData.data || []),
        commissionRate: DEFAULT_COMMISSION_RATE
      })

    } catch (err: any) {
      console.error('Error loading commission data:', err)
      setError(err.message || 'Failed to load commission data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCommissionData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCurrentPeriodName = () => {
    const month = new Date().getMonth()
    const quarter = Math.floor(month / 3) + 1
    return `Q${quarter} ${new Date().getFullYear()}`
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <Wallet className="w-5 h-5" />
            <span>My Commission - Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadCommissionData}
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
            <Wallet className="w-5 h-5 text-green-600" />
            <span>My Commission Tracker</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              {commissionData?.commissionRate}% rate
            </Badge>
            <button
              onClick={loadCommissionData}
              disabled={isLoading}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !commissionData ? (
          <div className="text-center py-6">
            <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No commission data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* This Month */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">This Month</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-800 mb-1">
                {formatCurrency(commissionData.thisMonth.commission)}
              </div>
              <div className="text-xs text-green-700">
                From {formatCurrency(commissionData.thisMonth.totalRevenue)} revenue • {commissionData.thisMonth.dealsCount} deals
              </div>
            </div>

            {/* This Quarter */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">{getCurrentPeriodName()}</span>
                </div>
              </div>
              <div className="text-xl font-bold text-blue-800 mb-1">
                {formatCurrency(commissionData.thisQuarter.commission)}
              </div>
              <div className="text-xs text-blue-700">
                From {formatCurrency(commissionData.thisQuarter.totalRevenue)} revenue • {commissionData.thisQuarter.dealsCount} deals
              </div>
            </div>

            {/* This Year */}
            <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">YTD {new Date().getFullYear()}</span>
                </div>
              </div>
              <div className="text-xl font-bold text-purple-800 mb-1">
                {formatCurrency(commissionData.thisYear.commission)}
              </div>
              <div className="text-xs text-purple-700">
                From {formatCurrency(commissionData.thisYear.totalRevenue)} revenue • {commissionData.thisYear.dealsCount} deals
              </div>
            </div>

            {/* Commission Info */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Commission Details</h4>
                <Settings className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="font-medium">{commissionData.commissionRate}% of closed deal value</span>
                </div>
                <div className="flex justify-between">
                  <span>Calculation:</span>
                  <span>Based on won deals only</span>
                </div>
                <div className="flex justify-between">
                  <span>Average deal:</span>
                  <span className="font-medium">
                    {commissionData.thisYear.dealsCount > 0 
                      ? formatCurrency(commissionData.thisYear.totalRevenue / commissionData.thisYear.dealsCount)
                      : '฿0'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Future Enhancement Notice */}
            <div className="text-center pt-3 border-t">
              <p className="text-xs text-gray-500">
                💡 Future: Custom rates, targets, and payment tracking
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MyCommissionWidget