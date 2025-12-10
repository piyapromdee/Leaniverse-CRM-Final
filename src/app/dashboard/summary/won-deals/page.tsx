'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Activity, Phone, Calendar, Mail, ArrowLeft, DollarSign, Users, TrendingUp, Trophy } from 'lucide-react'
import PageHeader from '@/components/page-header'

// Sample data for won deals and their activities
const wonDealsData = [
  {
    id: 1,
    company: 'GlobalTech Solutions',
    contact: 'James Wilson',
    value: 850000,
    stage: 'Closed Won',
    priority: 'High',
    closeDate: '2025-01-15',
    originalCloseDate: '2025-01-10',
    salesCycle: 45, // days
    activities: [
      { id: 1, type: 'call', title: 'Final negotiation call', completedDate: '2025-01-14', description: 'Closed on pricing and implementation timeline', status: 'completed' },
      { id: 2, type: 'meeting', title: 'Contract signing meeting', completedDate: '2025-01-15', description: 'Signed enterprise agreement', status: 'completed' },
      { id: 3, type: 'email', title: 'Sent contract documents', completedDate: '2025-01-13', description: 'Final contract terms and conditions', status: 'completed' },
      { id: 4, type: 'call', title: 'Technical requirements call', completedDate: '2025-01-10', description: 'Clarified implementation scope', status: 'completed' }
    ]
  },
  {
    id: 2,
    company: 'Local Business Inc',
    contact: 'Sarah Chen',
    value: 125000,
    stage: 'Closed Won',
    priority: 'Medium',
    closeDate: '2025-01-12',
    originalCloseDate: '2025-01-15',
    salesCycle: 30,
    activities: [
      { id: 5, type: 'call', title: 'Closing call with Sarah', completedDate: '2025-01-12', description: 'Finalized small business package', status: 'completed' },
      { id: 6, type: 'email', title: 'Proposal acceptance', completedDate: '2025-01-11', description: 'Received signed proposal', status: 'completed' },
      { id: 7, type: 'meeting', title: 'Product demo', completedDate: '2025-01-08', description: 'Demonstrated key features', status: 'completed' }
    ]
  },
  {
    id: 3,
    company: 'Marketing Pro Ltd',
    contact: 'David Rodriguez',
    value: 275000,
    stage: 'Closed Won',
    priority: 'High',
    closeDate: '2025-01-10',
    originalCloseDate: '2025-01-08',
    salesCycle: 38,
    activities: [
      { id: 8, type: 'meeting', title: 'Final decision meeting', completedDate: '2025-01-10', description: 'Approved marketing automation setup', status: 'completed' },
      { id: 9, type: 'call', title: 'Pricing discussion', completedDate: '2025-01-09', description: 'Agreed on implementation pricing', status: 'completed' },
      { id: 10, type: 'email', title: 'Sent detailed proposal', completedDate: '2025-01-07', description: 'Comprehensive solution proposal', status: 'completed' }
    ]
  },
  {
    id: 4,
    company: 'TechStart Innovations',
    contact: 'Emily Johnson',
    value: 95000,
    stage: 'Closed Won',
    priority: 'Medium',
    closeDate: '2025-01-08',
    originalCloseDate: '2025-01-10',
    salesCycle: 25,
    activities: [
      { id: 11, type: 'call', title: 'Contract finalization', completedDate: '2025-01-08', description: 'Signed startup package deal', status: 'completed' },
      { id: 12, type: 'meeting', title: 'Requirements gathering', completedDate: '2025-01-05', description: 'Identified specific needs', status: 'completed' }
    ]
  },
  {
    id: 5,
    company: 'Enterprise Corp',
    contact: 'Michael Brown',
    value: 450000,
    stage: 'Closed Won',
    priority: 'High',
    closeDate: '2025-01-06',
    originalCloseDate: '2025-01-05',
    salesCycle: 52,
    activities: [
      { id: 13, type: 'meeting', title: 'Board approval meeting', completedDate: '2025-01-06', description: 'Received final board approval', status: 'completed' },
      { id: 14, type: 'call', title: 'Executive stakeholder call', completedDate: '2025-01-04', description: 'Presented to C-level executives', status: 'completed' },
      { id: 15, type: 'email', title: 'ROI analysis report', completedDate: '2025-01-03', description: 'Detailed ROI calculations', status: 'completed' }
    ]
  }
]

type DealActivity = {
  id: number
  type: string
  title: string
  completedDate: string
  description: string
  status: string
}

type Deal = {
  id: number
  company: string
  contact: string
  value: number
  stage: string
  priority: string
  closeDate: string
  originalCloseDate: string
  salesCycle: number
  activities: DealActivity[]
}

export default function WonDealsSummaryPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Load won deals from current month only
  useEffect(() => {
    loadWonDealsThisMonth()
  }, [])

  const loadWonDealsThisMonth = async () => {
    console.log('🔄 [DEBUG] Loading won deals from current month only...')
    setLoading(true)
    
    try {
      // Get current month date range
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
      const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString()
      
      console.log('📅 [DEBUG] Date filter range:', {
        from: firstDayOfMonth,
        to: firstDayOfNextMonth
      })

      const { data: wonDeals, error } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(name),
          contact:contacts(name)
        `)
        .eq('stage', 'won')
        .gte('created_at', firstDayOfMonth)
        .lt('created_at', firstDayOfNextMonth)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [DEBUG] Error loading won deals:', error)
        // Fallback to mock data if database fails
        setDeals(wonDealsData.filter(deal => {
          const dealDate = new Date(deal.closeDate)
          return dealDate >= new Date(firstDayOfMonth) && dealDate < new Date(firstDayOfNextMonth)
        }))
        return
      }

      console.log('✅ [DEBUG] Loaded won deals from database:', wonDeals?.length || 0)
      
      // Transform database data to match UI format
      const formattedDeals = wonDeals?.map(deal => ({
        id: deal.id,
        company: deal.company?.name || 'Unknown Company',
        contact: deal.contact?.name || 'Unknown Contact',
        value: deal.value || 0,
        stage: 'Closed Won',
        priority: deal.priority || 'Medium',
        closeDate: deal.created_at ? new Date(deal.created_at).toISOString().split('T')[0] : today.toISOString().split('T')[0],
        originalCloseDate: deal.expected_close_date || deal.created_at,
        salesCycle: deal.sales_cycle_days || 30,
        activities: [] // Database doesn't have activities yet, so empty array
      })) || []

      setDeals(formattedDeals)
      console.log('✅ [DEBUG] Final formatted deals:', formattedDeals.length)
      
    } catch (err) {
      console.error('❌ [DEBUG] Unexpected error loading won deals:', err)
      // Fallback to filtered mock data
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      
      setDeals(wonDealsData.filter(deal => {
        const dealDate = new Date(deal.closeDate)
        return dealDate >= firstDayOfMonth && dealDate < firstDayOfNextMonth
      }))
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary statistics
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)
  const totalActivities = deals.reduce((sum, deal) => sum + deal.activities.length, 0)
  const averageDealSize = Math.round(totalValue / deals.length)
  const averageSalesCycle = Math.round(deals.reduce((sum, deal) => sum + deal.salesCycle, 0) / deals.length)
  const dealsClosedEarly = deals.filter(deal => new Date(deal.closeDate) <= new Date(deal.originalCloseDate)).length

  // Get all activities sorted by completion date
  const allActivities = deals.flatMap(deal => 
    deal.activities.map(activity => ({
      ...activity,
      dealCompany: deal.company,
      dealContact: deal.contact,
      dealValue: deal.value,
      dealCloseDate: deal.closeDate
    }))
  ).sort((a, b) => {
    const dateA = new Date(a.completedDate)
    const dateB = new Date(b.completedDate)
    return dateB.getTime() - dateA.getTime() // Most recent first
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone
      case 'meeting': return Calendar
      case 'email': return Mail
      default: return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-green-100 text-green-800'
      case 'meeting': return 'bg-blue-100 text-blue-800'
      case 'email': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getClosingPerformance = (closeDate: string, originalCloseDate: string) => {
    const actualDate = new Date(closeDate)
    const expectedDate = new Date(originalCloseDate)
    const diffDays = Math.ceil((actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) {
      return { status: 'early', text: diffDays === 0 ? 'On time' : `${Math.abs(diffDays)} days early`, color: 'text-green-600' }
    } else {
      return { status: 'late', text: `${diffDays} days late`, color: 'text-orange-600' }
    }
  }

  return (
    <>
      <PageHeader 
        title="Deals Won This Month"
        description="Detailed analysis of successfully closed deals and their winning activities"
      >
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading won deals for this month...</p>
            </div>
          </div>
        ) : (
          <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Total Won Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-green-600 mt-1">{deals.length} deals closed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Average Deal Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{formatCurrency(averageDealSize)}</div>
              <p className="text-xs text-blue-600 mt-1">Per deal average</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700">Sales Cycle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{averageSalesCycle} days</div>
              <p className="text-xs text-purple-600 mt-1">Average time to close</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Closing Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">{dealsClosedEarly}/{deals.length}</div>
              <p className="text-xs text-orange-600 mt-1">Closed early/on time</p>
            </CardContent>
          </Card>
        </div>

        {/* Won Deals Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-green-600" />
              <span>Won Deals Overview</span>
            </CardTitle>
            <CardDescription>All deals successfully closed this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deals.map((deal) => {
                const performance = getClosingPerformance(deal.closeDate, deal.originalCloseDate)
                return (
                  <div key={deal.id} className="p-4 border border-gray-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{deal.company}</h4>
                          <p className="text-sm text-gray-600">{deal.contact}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600">{formatCurrency(deal.value)}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                            Won
                          </Badge>
                          <span className={`text-xs font-medium ${performance.color}`}>
                            {performance.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Closed:</span> {formatDate(deal.closeDate)}
                      </div>
                      <div>
                        <span className="font-medium">Sales Cycle:</span> {deal.salesCycle} days
                      </div>
                      <div>
                        <span className="font-medium">Activities:</span> {deal.activities.length}
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span> {deal.priority}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Winning Activities Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-teal-600" />
              <span>Winning Activities Timeline</span>
            </CardTitle>
            <CardDescription>All activities that led to successful deal closures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {activity.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                            Won Deal
                          </Badge>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Completed {formatDate(activity.completedDate)}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{activity.dealCompany}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{formatCurrency(activity.dealValue)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">Deal closed {formatDate(activity.dealCloseDate)}</span>
                        </div>
                      </div>
                      
                      {activity.description && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{activity.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Performance Insights</span>
            </CardTitle>
            <CardDescription>Key metrics from your won deals this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Deal Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total deals won:</span>
                    <span className="text-sm font-medium">{deals.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Highest deal value:</span>
                    <span className="text-sm font-medium">{formatCurrency(Math.max(...deals.map(d => d.value)))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Shortest sales cycle:</span>
                    <span className="text-sm font-medium">{Math.min(...deals.map(d => d.salesCycle))} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Longest sales cycle:</span>
                    <span className="text-sm font-medium">{Math.max(...deals.map(d => d.salesCycle))} days</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Activity Insights</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total activities:</span>
                    <span className="text-sm font-medium">{totalActivities}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Activities per deal:</span>
                    <span className="text-sm font-medium">{Math.round(totalActivities / deals.length)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Most common activity:</span>
                    <span className="text-sm font-medium">Calls</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success rate:</span>
                    <span className="text-sm font-medium text-green-600">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </>
  )
}