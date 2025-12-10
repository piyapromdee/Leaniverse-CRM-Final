'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Target, Calendar, BarChart3, ArrowRight } from 'lucide-react'
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns'

interface Deal {
  id: string
  title: string
  value: number
  stage: string
  expected_close_date: string | null
  closed_date?: string | null
  created_at: string
  updated_at?: string
  user_id: string
}

interface ForecastData {
  currentMonth: {
    projected: number
    actualWon: number
    target: number
  }
  nextMonth: {
    projected: number
    target: number
  }
  quarterProjection: number
  pipelineValue: number
}

interface SalesForecastWidgetProps {
  dateRange?: { from: Date; to?: Date }
}

// Stage probability mapping for forecasting
const STAGE_PROBABILITIES = {
  'discovery': 0.15,    // 15% chance to close
  'proposal': 0.40,     // 40% chance to close  
  'negotiation': 0.65,  // 65% chance to close (if this stage exists)
  'won': 1.0,           // 100% - already closed
  'lost': 0.0           // 0% - already lost
}

export default function SalesForecastWidget({ dateRange }: SalesForecastWidgetProps) {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadForecastData()
  }, [dateRange])

  const loadForecastData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoading(false)
        return
      }

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setUserProfile(profile)

      // Build query based on user role
      let dealsQuery = supabase
        .from('deals')
        .select('*, closed_date')

      // Filter by user if sales role
      if (profile?.role === 'sales') {
        dealsQuery = dealsQuery.eq('user_id', user.id)
      }

      // Apply date range filter if provided
      if (dateRange?.from) {
        dealsQuery = dealsQuery.gte('created_at', dateRange.from.toISOString())
        if (dateRange.to) {
          const toDateEndOfDay = new Date(dateRange.to)
          toDateEndOfDay.setHours(23, 59, 59, 999)
          dealsQuery = dealsQuery.lte('created_at', toDateEndOfDay.toISOString())
        }
      }

      const { data: deals, error } = await dealsQuery

      if (error) {
        console.log('Note: Could not load deals for forecast (this is normal on first load):', error.message)
        setForecastData({
          currentMonth: {
            projected: 0,
            actualWon: 0,
            target: 500000
          },
          nextMonth: {
            projected: 0,
            target: 500000
          },
          quarterProjection: 0,
          pipelineValue: 0
        })
        setLoading(false)
        return
      }

      // Calculate forecast data
      const forecast = calculateForecast(deals || [])
      console.log('🔮 [FORECAST] Total deals:', deals?.length || 0)
      console.log('🔮 [FORECAST] Active deals:', deals?.filter(d => d.stage !== 'won' && d.stage !== 'lost').length || 0)
      console.log('🔮 [FORECAST] Deal stages:', deals?.map(d => d.stage) || [])
      console.log('🔮 [FORECAST] Forecast data:', forecast)
      setForecastData(forecast)

    } catch (error) {
      console.error('Error loading forecast data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateForecast = (deals: Deal[]): ForecastData => {
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const nextMonthStart = startOfMonth(addMonths(now, 1))
    const nextMonthEnd = endOfMonth(addMonths(now, 1))
    const quarterEnd = endOfMonth(addMonths(now, 2))

    // Get all active deals (not won/lost) for forecasting
    const activeDeals = deals.filter(deal => deal.stage !== 'won' && deal.stage !== 'lost')
    
    // Current month deals (expected to close this month OR high probability deals)
    const currentMonthDeals = deals.filter(deal => {
      // Include deals with expected close date this month
      if (deal.expected_close_date) {
        const closeDate = new Date(deal.expected_close_date)
        if (closeDate >= currentMonthStart && closeDate <= currentMonthEnd) {
          return true
        }
      }
      
      // Also include high probability deals (proposal+ stage) even without expected close date
      if (deal.stage === 'proposal' || deal.stage === 'negotiation') {
        return true
      }
      
      return false
    })

    // Next month deals (expected next month OR medium probability deals)
    const nextMonthDeals = deals.filter(deal => {
      // Include deals with expected close date next month
      if (deal.expected_close_date) {
        const closeDate = new Date(deal.expected_close_date)
        if (closeDate >= nextMonthStart && closeDate <= nextMonthEnd) {
          return true
        }
      }
      
      // Include all active deals for next month projection (distributed probability)
      return deal.stage !== 'won' && deal.stage !== 'lost'
    })

    // Calculate projections using stage probabilities
    const currentMonthProjected = currentMonthDeals.reduce((sum, deal) => {
      const probability = STAGE_PROBABILITIES[deal.stage as keyof typeof STAGE_PROBABILITIES] || 0.15
      return sum + (deal.value * probability)
    }, 0)

    // For next month, use a more conservative approach
    const nextMonthProjected = nextMonthDeals.reduce((sum, deal) => {
      let probability = STAGE_PROBABILITIES[deal.stage as keyof typeof STAGE_PROBABILITIES] || 0.15
      
      // Reduce probability for next month (deals take time to mature)
      if (deal.stage === 'discovery') probability = 0.05
      if (deal.stage === 'proposal') probability = 0.25
      if (deal.stage === 'negotiation') probability = 0.40
      
      return sum + (deal.value * probability)
    }, 0)

    // Quarter projection: sum of all active deals with adjusted probabilities
    const quarterProjection = activeDeals.reduce((sum, deal) => {
      const probability = STAGE_PROBABILITIES[deal.stage as keyof typeof STAGE_PROBABILITIES] || 0.15
      return sum + (deal.value * probability)
    }, 0)

    // Calculate actual won deals this month
    // For won deals, use the closed_date (when it was actually closed) or fallback to updated_at or created_at
    const actualWon = deals
      .filter(deal => {
        if (deal.stage !== 'won') return false
        // Use closed_date for when the deal was actually won, with fallbacks
        const wonDate = new Date(deal.closed_date || deal.updated_at || deal.created_at)
        return wonDate >= currentMonthStart && wonDate <= currentMonthEnd
      })
      .reduce((sum, deal) => sum + deal.value, 0)

    // Calculate total pipeline value (all open deals)
    const pipelineValue = deals
      .filter(deal => deal.stage !== 'won' && deal.stage !== 'lost')
      .reduce((sum, deal) => sum + deal.value, 0)

    // Default targets (these should come from settings/database eventually)
    const defaultMonthlyTarget = 500000 // 500K THB per month
    
    return {
      currentMonth: {
        projected: currentMonthProjected,
        actualWon,
        target: defaultMonthlyTarget
      },
      nextMonth: {
        projected: nextMonthProjected,
        target: defaultMonthlyTarget
      },
      quarterProjection,
      pipelineValue
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressColor = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return 'text-green-600'  // Above target - green
    if (percentage >= 80) return 'text-blue-600'    // Good performance - blue
    if (percentage >= 60) return 'text-yellow-600'  // Average performance - yellow
    return 'text-red-600'                           // Below average - red
  }

  const getProgressBarColor = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return 'bg-green-300'    // Above target - green (match other widgets)
    if (percentage >= 80) return 'bg-blue-400'      // Good performance - blue
    if (percentage >= 60) return 'bg-yellow-400'    // Average performance - yellow
    return 'bg-red-400'                             // Below average - red
  }

  const getCurrentMonthName = () => {
    return format(new Date(), 'MMMM yyyy')
  }

  const getNextMonthName = () => {
    return format(addMonths(new Date(), 1), 'MMMM yyyy')
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Sales Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading forecast...</div>
        </CardContent>
      </Card>
    )
  }

  if (!forecastData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Sales Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No forecast data available</div>
        </CardContent>
      </Card>
    )
  }

  const currentProgress = (forecastData.currentMonth.actualWon / forecastData.currentMonth.target) * 100
  const forecastProgress = (forecastData.currentMonth.projected / forecastData.currentMonth.target) * 100

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Sales Forecast
          </div>
          {userProfile?.role === 'sales' && (
            <span className="text-xs text-gray-500">Personal</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Month */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{getCurrentMonthName()}</span>
            <Target className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Actual Won:</span>
              <span className={`text-sm font-semibold ${getProgressColor(forecastData.currentMonth.actualWon, forecastData.currentMonth.target)}`}>
                {formatCurrency(forecastData.currentMonth.actualWon)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Projected:</span>
              <span className="text-sm font-semibold text-blue-600">
                {formatCurrency(forecastData.currentMonth.projected)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Target:</span>
              <span className="text-sm font-semibold text-gray-700">
                {formatCurrency(forecastData.currentMonth.target)}
              </span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`${getProgressBarColor(forecastData.currentMonth.actualWon, forecastData.currentMonth.target)} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(currentProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Won: {currentProgress.toFixed(0)}%</span>
              <span>Forecast: {forecastProgress.toFixed(0)}%</span>
            </div>
            
            {/* Forecast explanation */}
            <div className="mt-3 p-2 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-700 font-medium mb-1">💡 How we calculate projections:</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                Forecast includes deals with close probability: Discovery (15% chance), Proposal (40% chance).
                Your {forecastProgress.toFixed(0)}% forecast = {formatCurrency(forecastData.currentMonth.projected)} projected vs {formatCurrency(forecastData.currentMonth.target)} target.
              </p>
            </div>
          </div>
        </div>

        {/* Next Month */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{getNextMonthName()}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Projected:</span>
            <span className="text-sm font-semibold text-blue-600">
              {formatCurrency(forecastData.nextMonth.projected)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Target:</span>
            <span className="text-sm font-semibold text-gray-700">
              {formatCurrency(forecastData.nextMonth.target)}
            </span>
          </div>
        </div>

        {/* Pipeline Summary */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Pipeline Summary</span>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Total Pipeline:</span>
            <span className="text-sm font-semibold text-purple-600">
              {formatCurrency(forecastData.pipelineValue)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Quarter Forecast:</span>
            <span className="text-sm font-semibold text-indigo-600">
              {formatCurrency(forecastData.quarterProjection)}
            </span>
          </div>
          
          <div className="mt-2 p-2 bg-purple-50 rounded-md">
            <p className="text-xs text-purple-600">
              🎯 Pipeline = all open deals. Quarter Forecast = Pipeline × probability weighting.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}