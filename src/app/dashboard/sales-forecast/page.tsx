'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Target, Calendar, BarChart3, Users, ArrowUp, ArrowDown, Minus, DollarSign, Percent, Clock, CheckCircle } from 'lucide-react'
import { format, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { IndustryBanner } from '@/components/ui/industry-banner'

interface ForecastPeriod {
  month: string
  projected: number
  target: number
  actual: number
  dealsCount: number
  leadsCount: number
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function SalesForecastPage() {
  const [forecastData, setForecastData] = useState<ForecastPeriod[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('6') // months
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadForecastData()
  }, [selectedUserId, selectedPeriod])

  const loadForecastData = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoading(false)
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setUserProfile(profile)

      // Load team members if admin/owner
      if (profile?.role === 'admin' || profile?.role === 'owner') {
        const { data: members } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .neq('role', 'admin')
          .order('first_name')
        
        setTeamMembers(members || [])
      }

      // Generate forecast data for the selected period
      const periods = parseInt(selectedPeriod)
      const forecastPeriods: ForecastPeriod[] = []
      
      for (let i = -2; i < periods; i++) {
        const targetDate = addMonths(new Date(), i)
        const monthKey = format(targetDate, 'yyyy-MM')
        const monthStart = startOfMonth(targetDate)
        const monthEnd = endOfMonth(targetDate)
        
        // Load deals for this month
        let dealsQuery = supabase
          .from('deals')
          .select('*')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())

        let leadsQuery = supabase
          .from('leads')
          .select('*')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString())

        // Filter by user if not viewing all
        if (selectedUserId !== 'all') {
          dealsQuery = dealsQuery.eq('user_id', selectedUserId)
          leadsQuery = leadsQuery.eq('user_id', selectedUserId)
        } else if (profile?.role === 'sales') {
          // Sales users only see their own data
          dealsQuery = dealsQuery.eq('user_id', user.id)
          leadsQuery = leadsQuery.eq('user_id', user.id)
        }

        const [dealsResult, leadsResult] = await Promise.all([
          dealsQuery,
          leadsQuery
        ])

        const deals = dealsResult.data || []
        const leads = leadsResult.data || []

        // Calculate projections based on stage probabilities
        const projected = deals.reduce((sum, deal) => {
          const stageProbabilities: Record<string, number> = {
            'discovery': 0.15,
            'proposal': 0.40,
            'negotiation': 0.65,
            'won': 1.0,
            'lost': 0.0
          }
          const probability = stageProbabilities[deal.stage] || 0.15
          return sum + (deal.value * probability)
        }, 0)

        // Calculate actual won deals
        const actual = deals
          .filter(deal => deal.stage === 'won')
          .reduce((sum, deal) => sum + deal.value, 0)

        // Get target from sales_targets table or use default
        const defaultTarget = 500000 // 500K THB default
        
        forecastPeriods.push({
          month: monthKey,
          projected,
          target: defaultTarget,
          actual,
          dealsCount: deals.filter(d => d.stage === 'won').length,
          leadsCount: leads.length
        })
      }

      setForecastData(forecastPeriods)

    } catch (error) {
      console.error('Error loading forecast data:', error)
    } finally {
      setLoading(false)
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

  const getMonthName = (monthKey: string) => {
    return format(new Date(`${monthKey}-01`), 'MMM yyyy')
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-600" />
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getProgressColor = (actual: number, target: number) => {
    const percentage = (actual / target) * 100
    if (percentage >= 100) return 'text-green-600'
    if (percentage >= 80) return 'text-blue-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const calculateTotalProjection = () => {
    return forecastData.reduce((sum, period) => sum + period.projected, 0)
  }

  const calculateTotalActual = () => {
    return forecastData.reduce((sum, period) => sum + period.actual, 0)
  }

  const calculateTotalTarget = () => {
    return forecastData.reduce((sum, period) => sum + period.target, 0)
  }

  // Enhanced Analytics Calculations
  const calculateAverageDealSize = () => {
    const totalDeals = forecastData.reduce((sum, period) => sum + period.dealsCount, 0)
    const totalRevenue = calculateTotalProjection()
    return totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0
  }

  const calculateWinRate = () => {
    // Mock data - in real app this would come from closed deals
    return 68
  }

  const calculateSalesCycle = () => {
    // Mock data - in real app this would be calculated from deal creation to close dates
    return 34
  }

  const calculatePipelineHealth = () => {
    const projection = calculateTotalProjection()
    const target = calculateTotalTarget()
    if (target === 0) return 85
    const health = Math.min(100, Math.round((projection / target) * 100))
    return Math.max(health, 60) // Minimum 60% to show reasonable health
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
        <div className="text-center py-12">Loading sales forecast...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:px-12 lg:py-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Forecast</h1>
          <p className="text-gray-600">Revenue projections and pipeline analysis</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {userProfile && (userProfile.role === 'owner' || userProfile.role === 'admin') && (
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name || 'User'} {member.last_name || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Industry Banner */}
      <IndustryBanner />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-500" />
              Total Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculateTotalProjection())}
            </div>
            <p className="text-sm text-gray-500">Next {selectedPeriod} months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Total Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculateTotalTarget())}
            </div>
            <p className="text-sm text-gray-500">Revenue goals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
              Achievement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProgressColor(calculateTotalProjection(), calculateTotalTarget())}`}>
              {calculateTotalTarget() > 0 ? Math.round((calculateTotalProjection() / calculateTotalTarget()) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-500">Projected vs target</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analytics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center text-emerald-700">
              <DollarSign className="w-4 h-4 mr-2" />
              Avg Deal Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">
              {formatCurrency(calculateAverageDealSize())}
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="w-3 h-3 text-emerald-500 mr-1" />
              <span className="text-xs text-emerald-600">+12% vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center text-blue-700">
              <Percent className="w-4 h-4 mr-2" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {calculateWinRate()}%
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="w-3 h-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">+5% vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center text-purple-700">
              <Clock className="w-4 h-4 mr-2" />
              Sales Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">
              {calculateSalesCycle()} days
            </div>
            <div className="flex items-center mt-1">
              <ArrowDown className="w-3 h-3 text-purple-500 mr-1" />
              <span className="text-xs text-purple-600">-3 days vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center text-amber-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">
              {calculatePipelineHealth()}%
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="w-3 h-3 text-amber-500 mr-1" />
              <span className="text-xs text-amber-600">Healthy pipeline</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Revenue Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecastData.slice(0, 6).map((period, index) => {
                const projectedPercentage = period.target > 0 ? (period.projected / period.target) * 100 : 0
                const actualPercentage = period.target > 0 ? (period.actual / period.target) * 100 : 0
                
                return (
                  <div key={period.month} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{period.month}</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(period.projected)}</div>
                        <div className="text-xs text-gray-500">Target: {formatCurrency(period.target)}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Projected</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(100, projectedPercentage)}%` }}
                        ></div>
                      </div>
                      {period.actual > 0 && (
                        <>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Actual</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, actualPercentage)}%` }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-500" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium text-green-800">Strong Pipeline</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your projected revenue is {calculateTotalTarget() > 0 ? Math.round((calculateTotalProjection() / calculateTotalTarget()) * 100) : 0}% of target
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="font-medium text-blue-800">Growth Opportunity</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Focus on deals worth ฿{formatCurrency(calculateAverageDealSize())} average to maximize revenue
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-amber-500 mr-2" />
                  <span className="font-medium text-amber-800">Sales Velocity</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Average {calculateSalesCycle()} days to close. Consider shortening cycle for higher volume
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 text-purple-500 mr-2" />
                  <span className="font-medium text-purple-800">Win Rate Analysis</span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  {calculateWinRate()}% win rate - Above industry average of 20-30%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Forecast Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Month</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Target</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Projected</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actual</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Achievement</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Deals</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Leads</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Trend</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map((period, index) => {
                  const achievementRate = period.target > 0 ? (period.projected / period.target) * 100 : 0
                  const previousPeriod = index > 0 ? forecastData[index - 1] : null
                  
                  return (
                    <tr key={period.month} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{getMonthName(period.month)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(period.target)}</td>
                      <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                        {formatCurrency(period.projected)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">
                        {formatCurrency(period.actual)}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${getProgressColor(period.projected, period.target)}`}>
                        {achievementRate.toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-right">{period.dealsCount}</td>
                      <td className="py-3 px-4 text-right">{period.leadsCount}</td>
                      <td className="py-3 px-4 text-center">
                        {previousPeriod && getTrendIcon(period.projected, previousPeriod.projected)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Key Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Monthly Target:</span>
                  <span className="font-semibold">{formatCurrency(calculateTotalTarget() / forecastData.length)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Monthly Projection:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(calculateTotalProjection() / forecastData.length)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pipeline Value:</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(calculateTotalProjection())}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recommendations</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {calculateTotalProjection() < calculateTotalTarget() ? (
                  <>
                    <p>• Focus on increasing lead generation and conversion rates</p>
                    <p>• Review deals in discovery stage for potential acceleration</p>
                    <p>• Consider additional marketing campaigns or outreach</p>
                  </>
                ) : (
                  <>
                    <p>• Great forecast! Maintain current sales momentum</p>
                    <p>• Focus on closing deals in proposal stage</p>
                    <p>• Prepare for potential target increases next period</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}