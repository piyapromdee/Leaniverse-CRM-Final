'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Calendar, DollarSign, ExternalLink, Sparkles, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface RecentWin {
  id: string
  title: string
  value: number
  stage: string
  close_date: string | null
  closed_date?: string | null
  updated_at: string
  company?: {
    name: string
  }
  days_to_close: number
}

const MyRecentWinsWidget = () => {
  const [recentWins, setRecentWins] = useState<RecentWin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalWinValue, setTotalWinValue] = useState(0)
  const [timePeriod, setTimePeriod] = useState(30) // 7, 30, 90 days

  const supabase = createClient()

  const loadRecentWins = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Query for recent won deals based on selected time period
      const periodStartDate = new Date()
      periodStartDate.setDate(periodStartDate.getDate() - timePeriod)

      const { data, error: queryError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          value,
          stage,
          close_date,
          closed_date,
          updated_at,
          created_at,
          company:companies(name)
        `)
        .eq('user_id', user.id)
        .eq('stage', 'won')
        .gte('closed_date', periodStartDate.toISOString())
        .order('closed_date', { ascending: false })
        .limit(10)

      if (queryError) {
        console.error('Recent wins query error:', queryError)
        throw queryError
      }

      // Process the wins data
      const processedWins = (data || []).map(deal => {
        const createdAt = new Date(deal.created_at)
        const closedAt = new Date(deal.closed_date || deal.updated_at)
        const daysToClose = Math.floor((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: deal.id,
          title: deal.title,
          value: deal.value || 0,
          stage: deal.stage,
          close_date: deal.close_date,
          closed_date: deal.closed_date,
          updated_at: deal.updated_at,
          company: deal.company,
          days_to_close: daysToClose
        }
      })

      const totalValue = processedWins.reduce((sum, win) => sum + win.value, 0)
      
      setRecentWins(processedWins as unknown as RecentWin[])
      setTotalWinValue(totalValue)

    } catch (err: any) {
      console.error('Error loading recent wins:', err)
      setError(err.message || 'Failed to load recent wins')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecentWins()
  }, [timePeriod])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getWinColor = (value: number) => {
    if (value >= 100000) return 'from-yellow-50 to-yellow-100 border-yellow-200'
    if (value >= 50000) return 'from-green-50 to-green-100 border-green-200'
    return 'from-blue-50 to-blue-100 border-blue-200'
  }

  const getWinIcon = (value: number) => {
    if (value >= 100000) return <Sparkles className="w-4 h-4 text-yellow-600" />
    if (value >= 50000) return <Trophy className="w-4 h-4 text-green-600" />
    return <DollarSign className="w-4 h-4 text-blue-600" />
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>My Recent Wins - Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadRecentWins}
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
            <Trophy className="w-5 h-5 text-green-600" />
            <span>My Recent Wins</span>
            {!isLoading && recentWins.length > 0 && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                {recentWins.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select 
                value={timePeriod} 
                onChange={(e) => setTimePeriod(Number(e.target.value))}
                className="text-xs bg-white border border-gray-200 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                disabled={isLoading}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={loadRecentWins}
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
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : recentWins.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">No recent wins yet!</p>
            <p className="text-xs text-gray-500">Closed deals will appear here</p>
            <div className="mt-4">
              <Link href="/dashboard/deals">
                <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                  View All Deals →
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Wins Summary - Redesigned */}
            {recentWins.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">
                      Last {timePeriod} Days Total
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(totalWinValue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {recentWins.length} wins
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Wins List */}
            <div className="space-y-3">
              {recentWins.map(win => (
                <div 
                  key={win.id} 
                  className={`p-3 bg-gradient-to-r ${getWinColor(win.value)} rounded-lg border transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getWinIcon(win.value)}
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {win.title}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        {win.company?.name && (
                          <Badge variant="outline" className="text-xs bg-white">
                            {win.company.name}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-600">
                          {win.days_to_close} days to close
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(win.value)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(win.closed_date || win.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        Closed {formatDistanceToNow(new Date(win.closed_date || win.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                    <Link href={`/dashboard/deals/${win.id}`}>
                      <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Link */}
            <div className="pt-3 border-t">
              <Link href="/dashboard/deals?status=won">
                <button className="w-full text-sm text-green-600 hover:text-green-800 font-medium">
                  View All Won Deals →
                </button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MyRecentWinsWidget