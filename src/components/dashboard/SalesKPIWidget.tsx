'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Target, TrendingUp, Award, AlertCircle, Edit3, Check, X } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface SalesTarget {
  id?: string
  user_id: string
  month: string // YYYY-MM format
  revenue_target: number
  deals_target: number
  leads_target: number
  created_at?: string
  updated_at?: string
}

interface KPIData {
  target: SalesTarget
  actual: {
    revenue: number
    deals: number
    leads: number
    winRate: number
  }
  progress: {
    revenue: number
    deals: number
    leads: number
  }
}

interface SalesKPIWidgetProps {
  dateRange?: { from: Date; to?: Date }
}

export default function SalesKPIWidget({ dateRange }: SalesKPIWidgetProps) {
  console.log('🔍 SalesKPIWidget - Component mounting with dateRange:', dateRange)
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingTarget, setEditingTarget] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [newTarget, setNewTarget] = useState({
    revenue_target: 500000,
    deals_target: 10,
    leads_target: 50
  })
  
  const supabase = createClient()
  const currentMonth = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    loadKPIData()
  }, [dateRange])

  const loadKPIData = async () => {
    console.log('🔍 SalesKPI loadKPIData - Starting')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.log('🔍 SalesKPI loadKPIData - Auth error or no user:', authError)
        setLoading(false)
        return
      }
      console.log('🔍 SalesKPI loadKPIData - User found:', user.id)

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setUserProfile(profile)

      // Load current month's targets
      const { data: targets, error: targetsError } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .single()

      let currentTarget: SalesTarget

      if (targetsError || !targets) {
        // Create default target if none exists
        currentTarget = {
          user_id: user.id,
          month: currentMonth,
          revenue_target: 500000, // 500K THB default
          deals_target: 10,       // 10 deals default
          leads_target: 50        // 50 leads default
        }
        
        // Save default target to database
        const { data: newTargetData, error: insertError } = await supabase
          .from('sales_targets')
          .insert([currentTarget])
          .select()
          .single()
        
        if (insertError) {
          console.log('Note: Could not create default target (this is normal if table does not exist yet):', insertError.message)
        } else if (newTargetData) {
          currentTarget = newTargetData
        }
      } else {
        currentTarget = targets
      }

      // Load actual performance data
      const actual = await loadActualPerformance(user.id, profile?.role)
      
      // Calculate progress percentages
      const progress = {
        revenue: currentTarget.revenue_target > 0 ? (actual.revenue / currentTarget.revenue_target) * 100 : 0,
        deals: currentTarget.deals_target > 0 ? (actual.deals / currentTarget.deals_target) * 100 : 0,
        leads: currentTarget.leads_target > 0 ? (actual.leads / currentTarget.leads_target) * 100 : 0
      }

      setKpiData({
        target: currentTarget,
        actual,
        progress
      })

      setNewTarget({
        revenue_target: currentTarget.revenue_target,
        deals_target: currentTarget.deals_target,
        leads_target: currentTarget.leads_target
      })

    } catch (error) {
      console.error('Error loading KPI data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActualPerformance = async (userId: string, userRole: string) => {
    // Use date range if provided, otherwise use current month
    let startDate, endDate
    if (dateRange?.from) {
      startDate = dateRange.from
      endDate = dateRange.to || dateRange.from
      const endDateEndOfDay = new Date(endDate)
      endDateEndOfDay.setHours(23, 59, 59, 999)
      endDate = endDateEndOfDay
    } else {
      startDate = startOfMonth(new Date())
      endDate = endOfMonth(new Date())
    }

    console.log('🔍 SalesKPI loadActualPerformance - Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() })

    // Build queries for won deals and all deals in period for win rate calculation
    let wonDealsQuery = supabase
      .from('deals')
      .select('*, closed_date')
      .eq('stage', 'won')
      .gte('closed_date', startDate.toISOString())
      .lte('closed_date', endDate.toISOString())

    let allDealsQuery = supabase
      .from('deals')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('stage', ['won', 'lost']) // Only count deals with final outcomes for win rate

    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .not('status', 'in', '(converted,lost)')

    console.log('🔍 SalesKPI - User role:', userRole, 'User ID:', userId)

    // Filter by user if sales role - check both user_id (creator) and assigned_to (assignee)
    if (userRole === 'sales') {
      // Check both who created the deal (user_id) and who it's assigned to (assigned_to)
      wonDealsQuery = wonDealsQuery.or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
      allDealsQuery = allDealsQuery.or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
      // For sales users, show all leads since they're all from the same company
      // leadsQuery remains unfiltered to include all company leads
    }

    const [wonDealsResult, allDealsResult, leadsResult] = await Promise.all([
      wonDealsQuery,
      allDealsQuery,
      leadsQuery
    ])

    const wonDeals = wonDealsResult.data || []
    const allDeals = allDealsResult.data || []
    const leads = leadsResult.data || []

    // Calculate win rate
    const winRate = allDeals.length > 0 ? Math.round((wonDeals.length / allDeals.length) * 100) : 0

    console.log('🔍 SalesKPI - Query results:', {
      wonDealsCount: wonDeals.length,
      allDealsCount: allDeals.length,
      leadsCount: leads.length,
      winRate: winRate,
      wonDealsError: wonDealsResult.error,
      allDealsError: allDealsResult.error,
      leadsError: leadsResult.error
    })
    
    if (leads.length > 0) {
      console.log('🔍 SalesKPI - Sample leads:', leads.slice(0, 2).map(l => ({ id: l.id, status: l.status, created_at: l.created_at })))
    }

    return {
      revenue: wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
      deals: wonDeals.length,
      leads: leads.length,
      winRate: winRate
    }
  }

  const saveTarget = async () => {
    if (!kpiData?.target.user_id) return

    try {
      const updatedTarget = {
        ...kpiData.target,
        ...newTarget,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('sales_targets')
        .upsert([updatedTarget], { onConflict: 'user_id,month' })

      if (error) throw error

      setEditingTarget(false)
      loadKPIData() // Reload to get updated progress
    } catch (error) {
      console.error('Error saving target:', error)
      alert('Failed to save target')
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600'  // Above target - green
    if (percentage >= 80) return 'text-blue-600'    // Good performance - blue  
    if (percentage >= 60) return 'text-yellow-600'  // Average performance - yellow
    return 'text-red-600'                           // Below average - red
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-300'    // Match other widgets
    if (percentage >= 80) return 'bg-blue-400'      // Match Top 5 Lead Sources
    if (percentage >= 60) return 'bg-yellow-400'    // Match other widgets
    return 'bg-red-400'                             // Warning color
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return <Award className="w-4 h-4 text-green-600" />
    if (percentage >= 80) return <TrendingUp className="w-4 h-4 text-blue-600" />
    return <AlertCircle className="w-4 h-4 text-red-600" />
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            Monthly KPIs (Loading...)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading KPIs... Component mounted successfully!</div>
        </CardContent>
      </Card>
    )
  }

  if (!kpiData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            Monthly KPIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">No KPI data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            Monthly KPIs
          </div>
          <div className="flex items-center space-x-2">
            {userProfile?.role === 'sales' && (
              <span className="text-xs text-gray-500">Personal</span>
            )}
            {!editingTarget ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingTarget(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveTarget}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTarget(false)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-500">{format(new Date(), 'MMMM yyyy')} Targets</p>
        </div>

        {/* Revenue KPI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Revenue Target</span>
            {getStatusIcon(kpiData.progress.revenue)}
          </div>
          
          {editingTarget ? (
            <Input
              type="number"
              value={newTarget.revenue_target}
              onChange={(e) => setNewTarget({...newTarget, revenue_target: parseInt(e.target.value) || 0})}
              className="text-sm"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {formatCurrency(kpiData.actual.revenue)} / {formatCurrency(kpiData.target.revenue_target)}
                </span>
                <span className={`text-sm font-semibold ${getProgressColor(kpiData.progress.revenue)}`}>
                  {kpiData.progress.revenue.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(kpiData.progress.revenue)}`}
                  style={{ width: `${Math.min(kpiData.progress.revenue, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Deals KPI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Deals Target</span>
            {getStatusIcon(kpiData.progress.deals)}
          </div>
          
          {editingTarget ? (
            <Input
              type="number"
              value={newTarget.deals_target}
              onChange={(e) => setNewTarget({...newTarget, deals_target: parseInt(e.target.value) || 0})}
              className="text-sm"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {kpiData.actual.deals} / {kpiData.target.deals_target} deals
                </span>
                <span className={`text-sm font-semibold ${getProgressColor(kpiData.progress.deals)}`}>
                  {kpiData.progress.deals.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(kpiData.progress.deals)}`}
                  style={{ width: `${Math.min(kpiData.progress.deals, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Leads KPI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Leads Target</span>
            {getStatusIcon(kpiData.progress.leads)}
          </div>
          
          {editingTarget ? (
            <Input
              type="number"
              value={newTarget.leads_target}
              onChange={(e) => setNewTarget({...newTarget, leads_target: parseInt(e.target.value) || 0})}
              className="text-sm"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {kpiData.actual.leads} / {kpiData.target.leads_target} leads
                </span>
                <span className={`text-sm font-semibold ${getProgressColor(kpiData.progress.leads)}`}>
                  {kpiData.progress.leads.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(kpiData.progress.leads)}`}
                  style={{ width: `${Math.min(kpiData.progress.leads, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Win Rate - No target, just performance indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Win Rate</span>
            {kpiData.actual.winRate >= 70 ? <Award className="w-4 h-4 text-green-600" /> :
             kpiData.actual.winRate >= 50 ? <TrendingUp className="w-4 h-4 text-blue-600" /> :
             <AlertCircle className="w-4 h-4 text-red-600" />}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Deals conversion rate
              </span>
              <span className={`text-sm font-semibold ${
                kpiData.actual.winRate >= 70 ? 'text-green-600' :
                kpiData.actual.winRate >= 50 ? 'text-blue-600' :
                'text-red-600'
              }`}>
                {kpiData.actual.winRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  kpiData.actual.winRate >= 70 ? 'bg-green-300' :
                  kpiData.actual.winRate >= 50 ? 'bg-blue-400' :
                  'bg-red-400'
                }`}
                style={{ width: `${Math.min(kpiData.actual.winRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Overall Performance Summary */}
        <div className="pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500">Overall Performance</p>
            <div className="mt-2 flex justify-center">
              {(() => {
                const avgProgress = (kpiData.progress.revenue + kpiData.progress.deals + kpiData.progress.leads) / 3
                return (
                  <span className={`text-lg font-bold ${getProgressColor(avgProgress)}`}>
                    {avgProgress.toFixed(0)}%
                  </span>
                )
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}