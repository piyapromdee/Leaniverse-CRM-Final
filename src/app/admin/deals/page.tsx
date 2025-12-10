'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import MasterFilterBar from '@/components/MasterFilterBar'
import { useMasterFilter } from '@/contexts/MasterFilterContext'
import { TrendingUp, Target, DollarSign, AlertTriangle, User } from 'lucide-react'
import Link from 'next/link'

interface Deal {
  id: string
  name: string
  title?: string
  value: number
  stage: string
  assigned_to?: string
  company_name?: string
  created_at: string
  updated_at: string
  assignee?: {
    first_name: string
    last_name: string
  }
  company?: {
    id: string
    name: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

export default function AdminDealsOverview() {
  const { masterTimePeriod, masterAssignee, masterSource, getDateRange } = useMasterFilter()
  const [stats, setStats] = useState({
    totalDeals: 0,
    pipelineValue: 0,
    wonThisMonth: 0,
    atRisk: 0,
    avgDealSize: 0,
    conversionRate: 0
  })
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false)

  useEffect(() => {
    fetchDealsStats()
    fetchUsers()
  }, [masterTimePeriod, masterAssignee, masterSource])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users-list')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchDealsStats = async () => {
    try {
      const supabase = createClient()
      const { startDate, endDate } = getDateRange()

      let query = supabase
        .from('deals')
        .select(`
          *,
          assignee:assigned_to(first_name, last_name),
          company:company_id(id, name)
        `)

      // Apply time period filter
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
      }

      // Apply assignee filter
      if (masterAssignee !== 'all') {
        query = query.eq('assigned_to', masterAssignee)
      }

      // Apply source/marketing channel filter
      if (masterSource !== 'all') {
        query = query.eq('source', masterSource)
      }

      const { data: dealsData } = await query.order('created_at', { ascending: false })

      if (dealsData) {
        // Store all deals
        setDeals(dealsData)

        const activeDeals = dealsData.filter(d => d.stage !== 'won' && d.stage !== 'lost')
        const wonDeals = dealsData.filter(d => d.stage === 'won')
        const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)
        const avgDealSize = dealsData.length > 0 ? dealsData.reduce((sum, d) => sum + (d.value || 0), 0) / dealsData.length : 0

        // Calculate won this month
        const currentMonth = new Date().getMonth()
        const wonThisMonth = wonDeals.filter(d => {
          const dealDate = new Date(d.updated_at || d.created_at)
          return dealDate.getMonth() === currentMonth
        }).length

        // Calculate at risk (stale active deals only)
        const now = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        console.log('🔍 [AT RISK] Checking deals. Current date:', now.toISOString())
        console.log('🔍 [AT RISK] 30 days ago:', thirtyDaysAgo.toISOString())
        console.log('🔍 [AT RISK] Active deals count:', activeDeals.length)

        const atRiskDeals = activeDeals.filter(d => {
          // Use updated_at, fallback to created_at if null
          const lastActivityDate = d.updated_at || d.created_at
          if (!lastActivityDate) {
            console.log('⚠️ [AT RISK] Deal has no date:', d.id, d.title)
            return false
          }

          const activityDate = new Date(lastActivityDate)
          const isStale = activityDate < thirtyDaysAgo
          const daysSinceUpdate = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

          if (isStale) {
            console.log('🚨 [AT RISK] Found stale deal:', {
              id: d.id,
              title: d.title?.substring(0, 30),
              stage: d.stage,
              lastActivity: activityDate.toISOString(),
              daysSinceUpdate
            })
          }

          return isStale
        })

        const atRisk = atRiskDeals.length
        console.log('📊 [AT RISK] Total at-risk deals:', atRisk)

        setStats({
          totalDeals: dealsData.length,
          pipelineValue,
          wonThisMonth,
          atRisk,
          avgDealSize,
          conversionRate: dealsData.length > 0 ? Math.round((wonDeals.length / dealsData.length) * 100) : 0
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching deals stats:', error)
      setLoading(false)
    }
  }

  const getStageBadgeColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'won':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      case 'proposal':
        return 'bg-blue-100 text-blue-800'
      case 'negotiation':
        return 'bg-purple-100 text-purple-800'
      case 'discovery':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAssigneeInitials = (assignee: { first_name: string; last_name: string } | undefined) => {
    if (!assignee) return '?'
    return `${assignee.first_name?.[0] || ''}${assignee.last_name?.[0] || ''}`
  }

  const getAssigneeName = (assignee: { first_name: string; last_name: string } | undefined) => {
    if (!assignee) return 'Unassigned'
    return `${assignee.first_name} ${assignee.last_name}`
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals Overview</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all deals across the organization</p>
        </div>

        {/* Master Filter Bar */}
        <MasterFilterBar users={users} showSource={true} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDeals}</div>
              <p className="text-xs text-muted-foreground">Across all stages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{stats.pipelineValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Active deals value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.wonThisMonth}</div>
              <p className="text-xs text-muted-foreground">Closed deals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.atRisk}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{Math.round(stats.avgDealSize).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Average value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">Won vs total</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard/deals">
            <Button>View All Deals</Button>
          </Link>
          <Button
            variant={showAtRiskOnly ? "default" : "outline"}
            onClick={() => setShowAtRiskOnly(!showAtRiskOnly)}
          >
            {showAtRiskOnly ? 'Show All Deals' : 'Review At-Risk Deals'}
          </Button>
        </div>

        {/* Active Deals Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {showAtRiskOnly ? 'At-Risk Deals' : 'All Organization Deals'}
              {showAtRiskOnly && (
                <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200">
                  {(() => {
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    return deals.filter(d => {
                      const lastActivityDate = d.updated_at || d.created_at
                      if (!lastActivityDate) return false
                      const activityDate = new Date(lastActivityDate)
                      const isStale = activityDate < thirtyDaysAgo
                      const isActive = d.stage !== 'won' && d.stage !== 'lost'
                      return isStale && isActive
                    }).length
                  })()} at risk
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {showAtRiskOnly
                ? 'Deals that haven\'t been updated in over 30 days and need attention'
                : 'Complete list of deals across all stages and team members'
              }
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading deals...</div>
              </div>
            ) : (() => {
              // Filter at-risk deals if needed
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              const filteredDeals = showAtRiskOnly
                ? deals.filter(d => {
                    // At-Risk: Not updated in 30+ days AND not already won/lost
                    const lastActivityDate = d.updated_at || d.created_at
                    if (!lastActivityDate) return false
                    const activityDate = new Date(lastActivityDate)
                    const isStale = activityDate < thirtyDaysAgo
                    const isActive = d.stage !== 'won' && d.stage !== 'lost'
                    return isStale && isActive
                  })
                : deals

              return filteredDeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>{showAtRiskOnly ? 'No at-risk deals found' : 'No deals found'}</p>
                  {!showAtRiskOnly && (
                    <Link href="/dashboard/deals">
                      <Button className="mt-4">Create First Deal</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Deal Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Company</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Value</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Stage</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Assigned To</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeals.map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 max-w-xs truncate" title={deal.title || deal.name || 'Untitled Deal'}>
                            {deal.title || deal.name || 'Untitled Deal'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate" title={deal.company?.name || deal.company_name || '-'}>
                            {deal.company?.name || deal.company_name || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-semibold text-gray-900">
                            ฿{(deal.value || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStageBadgeColor(deal.stage)}>
                            {deal.stage || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                {getAssigneeInitials(deal.assignee)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-700">
                              {getAssigneeName(deal.assignee)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/deals/${deal.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredDeals.length > 0 && (
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Showing {filteredDeals.length} deal{filteredDeals.length === 1 ? '' : 's'}
                      {showAtRiskOnly && ` (filtered from ${deals.length} total)`}
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
