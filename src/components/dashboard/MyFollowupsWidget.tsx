'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, Phone, Mail, Calendar, ExternalLink, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'
import Link from 'next/link'

interface Followup {
  id: string
  title: string
  type: 'task' | 'appointment' | 'call' | 'email'
  date: string
  start_time?: string
  priority: 'High' | 'Medium' | 'Low'
  status: string
  description?: string
  deal_id?: string
  deal_title?: string
  contact_name?: string
  is_overdue: boolean
  is_today: boolean
  days_overdue?: number
}

const MyFollowupsWidget = () => {
  const [followups, setFollowups] = useState<Followup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadFollowups = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Get upcoming and overdue tasks/appointments
      const today = new Date()
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(today.getDate() + 7)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(today.getDate() - 7)

      // Query deals with expected close dates coming up
      const { data, error: queryError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          value,
          expected_close_date,
          stage,
          priority,
          channel,
          user_id
        `)
        .eq('user_id', user.id)
        .not('stage', 'in', '(won,lost)')
        .not('expected_close_date', 'is', null)
        .gte('expected_close_date', oneWeekAgo.toISOString().split('T')[0])
        .lte('expected_close_date', oneWeekFromNow.toISOString().split('T')[0])
        .order('expected_close_date', { ascending: true })

      if (queryError) {
        console.error('Followups query error:', queryError)
        throw queryError
      }

      // Process deals to determine urgency and close date status
      const processedFollowups = (data || []).map(item => {
        const closeDate = new Date(item.expected_close_date + 'T00:00:00') // Ensure proper date parsing
        const isOverdueItem = isPast(closeDate) && !isToday(closeDate)
        const isTodayItem = isToday(closeDate)
        
        let daysOverdue = 0
        if (isOverdueItem) {
          daysOverdue = Math.floor((today.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          id: item.id,
          title: item.title,
          type: 'task' as const,
          date: item.expected_close_date,
          start_time: undefined,
          priority: item.priority || 'Medium',
          status: item.stage,
          description: `${item.stage} • ฿${item.value?.toLocaleString() || '0'} • ${item.channel || 'Unknown'}`,
          deal_id: item.id,
          is_overdue: isOverdueItem,
          is_today: isTodayItem,
          days_overdue: daysOverdue
        } as Followup
      })

      // Sort by priority: overdue first, then today, then upcoming
      const sortedFollowups = processedFollowups.sort((a, b) => {
        // First sort by urgency
        if (a.is_overdue && !b.is_overdue) return -1
        if (!a.is_overdue && b.is_overdue) return 1
        if (a.is_today && !b.is_today && !b.is_overdue) return -1
        if (!a.is_today && b.is_today && !a.is_overdue) return 1
        
        // Then by date
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

      setFollowups(sortedFollowups.slice(0, 8)) // Show top 8 most important

    } catch (err: any) {
      console.error('Error loading followups:', err)
      setError(err.message || 'Failed to load follow-ups')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFollowups()
  }, [])

  const getFollowupIcon = (type: string) => {
    switch (type) {
      case 'deal': return <ExternalLink className="w-4 h-4 text-green-600" />
      case 'call': return <Phone className="w-4 h-4 text-blue-600" />
      case 'email': return <Mail className="w-4 h-4 text-purple-600" />
      case 'meeting': return <Calendar className="w-4 h-4 text-green-600" />
      case 'appointment': return <Calendar className="w-4 h-4 text-green-600" />
      default: return <CheckSquare className="w-4 h-4 text-gray-600" />
    }
  }

  const getFollowupPriority = (priority: string, isOverdue: boolean, isToday: boolean) => {
    if (isOverdue) {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'OVERDUE'
      }
    }
    // Show priority for all items, including today items
    switch (priority) {
      case 'High':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          label: 'HIGH'
        }
      case 'Medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'MED'
        }
      case 'Low':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'LOW'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'NORMAL'
        }
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'All day'
    try {
      const [hours, minutes] = timeString.split(':')
      return `${hours}:${minutes}`
    } catch {
      return timeString
    }
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>My Follow-ups - Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={loadFollowups}
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
            <Clock className="w-5 h-5 text-orange-600" />
            <span>Deals Closing Soon</span>
            {!isLoading && (
              <Badge variant="outline" className="ml-2">
                {followups.filter(f => f.is_overdue || f.is_today).length} urgent
              </Badge>
            )}
          </div>
          <button
            onClick={loadFollowups}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
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
        ) : followups.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">All caught up! 🎉</p>
            <p className="text-xs text-gray-500">No follow-ups due in the next week</p>
            <div className="mt-4">
              <Link href="/dashboard/calendar">
                <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                  View Calendar →
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {followups.map(followup => {
              const priorityStyle = getFollowupPriority(followup.priority, followup.is_overdue, followup.is_today)
              
              return (
                <div 
                  key={followup.id}
                  className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                    followup.is_overdue 
                      ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200' 
                      : followup.is_today 
                        ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getFollowupIcon(followup.type)}
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {followup.title}
                      </h4>
                    </div>
                    <Badge className={`text-xs ${priorityStyle.color} ml-2`}>
                      {priorityStyle.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {followup.is_today 
                            ? 'Today' 
                            : followup.is_overdue 
                              ? `${followup.days_overdue} days ago`
                              : format(new Date(followup.date), 'MMM dd')
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(followup.start_time)}</span>
                      </div>
                    </div>
                  </div>

                  {followup.description && (
                    <p className="text-xs text-gray-700 mb-2 truncate">
                      {followup.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      {followup.is_overdue && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {followup.days_overdue} days overdue
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link href="/dashboard/deals">
                        <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Summary and Actions */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {followups.filter(f => f.is_overdue).length} overdue, {followups.filter(f => f.is_today).length} today
                </span>
                <Link href="/dashboard/deals">
                  <button className="text-blue-600 hover:text-blue-800 underline">
                    View All →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MyFollowupsWidget