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
import { CheckCircle, Clock, AlertCircle, Calendar, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description?: string
  date: string
  start_time?: string
  end_time?: string
  status: string
  assigned_to?: string
  contact_id?: string
  deal_id?: string
  created_at: string
  updated_at: string
  assignee?: {
    first_name: string
    last_name: string
  }
  contact?: {
    name: string
    first_name?: string
    last_name?: string
  }
  deal?: {
    id: string
    name?: string
    title?: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

export default function AdminTasksOverview() {
  const { masterTimePeriod, masterAssignee, getDateRange } = useMasterFilter()
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedToday: 0,
    pending: 0,
    overdue: 0,
    upcomingWeek: 0,
    completionRate: 0
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchTasksStats()
    fetchUsers()
  }, [masterTimePeriod, masterAssignee])

  // Debug: Log when users state changes
  useEffect(() => {
    console.log('🎯 [TASKS] Users state updated:', users.length, 'users')
    if (users.length > 0) {
      console.log('👥 [TASKS] Sample user:', users[0])
    }
  }, [users])

  // Auto-refresh when page becomes visible (e.g., switching back to this tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 [ADMIN TASKS] Page visible - refreshing data')
        fetchTasksStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [masterTimePeriod, masterAssignee])

  const fetchUsers = async () => {
    try {
      console.log('🔍 [TASKS] Fetching users for Master Filter Bar...')
      const response = await fetch('/api/admin/users-list')
      if (response.ok) {
        const data = await response.json()
        console.log('✅ [TASKS] Users loaded:', data.users?.length || 0, 'users')
        console.log('📋 [TASKS] Users data:', data.users)
        setUsers(data.users || [])
      } else {
        console.error('❌ [TASKS] Failed to fetch users:', response.status)
      }
    } catch (error) {
      console.error('❌ [TASKS] Error fetching users:', error)
    }
  }

  const fetchTasksStats = async () => {
    try {
      const { startDate, endDate } = getDateRange()

      // Build query parameters for stats (with time filter)
      const statsParams = new URLSearchParams()
      if (startDate) {
        statsParams.append('startDate', startDate.toISOString().split('T')[0])
        statsParams.append('endDate', endDate.toISOString().split('T')[0])
      }
      if (masterAssignee !== 'all') {
        statsParams.append('assignee', masterAssignee)
      }
      statsParams.append('includeCompleted', 'true') // Include all tasks for stats

      // Build query parameters for pending tasks table (NO time filter - show ALL pending tasks)
      const pendingParams = new URLSearchParams()
      if (masterAssignee !== 'all') {
        pendingParams.append('assignee', masterAssignee)
      }
      // Don't include completed tasks for the pending tasks table

      // Build query parameters for TOTAL count (NO filters at all - grand total)
      const totalParams = new URLSearchParams()
      totalParams.append('includeCompleted', 'true')
      // No assignee filter, no date filter - get ALL tasks for total count

      // Fetch all three in parallel
      const [statsResponse, pendingResponse, totalResponse] = await Promise.all([
        fetch(`/api/admin/team-tasks?${statsParams.toString()}`),
        fetch(`/api/admin/team-tasks?${pendingParams.toString()}`),
        fetch(`/api/admin/team-tasks?${totalParams.toString()}`)
      ])

      if (!statsResponse.ok) {
        console.error('Error fetching team tasks stats:', await statsResponse.text())
        setLoading(false)
        return
      }

      if (!pendingResponse.ok) {
        console.error('Error fetching pending tasks:', await pendingResponse.text())
        setLoading(false)
        return
      }

      if (!totalResponse.ok) {
        console.error('Error fetching total tasks count:', await totalResponse.text())
        setLoading(false)
        return
      }

      const { tasks: statsData } = await statsResponse.json()
      const { tasks: pendingData } = await pendingResponse.json()
      const { tasks: totalData } = await totalResponse.json()

      // Use pendingData for the tasks table (all pending/in-progress tasks across all time)
      setTasks(pendingData || [])

      // Use statsData for calculating metrics (filtered by time period)
      const tasksData: Task[] = statsData || []

      if (tasksData) {
        // Calculate stats from statsData (time-filtered)

        // Normalize today to start of day (midnight) for accurate date comparisons
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayStr = today.toISOString().split('T')[0]

        // Calculate start and end of current calendar week (Monday to Sunday)
        const startOfWeek = new Date(today)
        const dayOfWeek = startOfWeek.getDay() // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert Sunday=0 to 6 days back
        startOfWeek.setDate(startOfWeek.getDate() - daysToMonday)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 6) // Sunday
        endOfWeek.setHours(23, 59, 59, 999)

        console.log('📅 [TASKS] Week calculation:', {
          today: todayStr,
          startOfWeek: startOfWeek.toISOString().split('T')[0],
          endOfWeek: endOfWeek.toISOString().split('T')[0],
          dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]
        })

        const completedToday = tasksData.filter(t =>
          t.status === 'completed' &&
          t.updated_at?.startsWith(todayStr)
        ).length

        const pending = tasksData.filter(t => t.status === 'pending' || t.status === 'in_progress').length

        // Enhanced overdue calculation - checks both date AND time
        const now = new Date()
        console.log('🔍 [OVERDUE DEBUG] Total tasks:', tasksData.length)
        console.log('🔍 [OVERDUE DEBUG] Now:', now.toISOString())

        const overdueTasks = tasksData.filter(t => {
          // Skip completed/cancelled tasks
          const isCompleted = t.status === 'completed' || t.status === 'cancelled'
          if (isCompleted) return false

          // Skip tasks without dates
          if (!t.date) return false

          let isOverdue = false

          // Check if task has end_time - use it for precise overdue calculation
          if (t.end_time) {
            const endTime = new Date(t.end_time)
            isOverdue = endTime < now
          } else {
            // No end_time - just check if date is in the past
            const taskDate = new Date(t.date)
            taskDate.setHours(0, 0, 0, 0)
            isOverdue = taskDate < today
          }

          console.log('🔍 [TASK]', {
            id: t.id,
            title: t.title?.substring(0, 30),
            date: t.date,
            end_time: t.end_time,
            status: t.status,
            isCompleted,
            isOverdue
          })

          return isOverdue
        })

        const overdue = overdueTasks.length
        console.log('📊 [OVERDUE] Found', overdue, 'overdue tasks:', overdueTasks.map(t => ({
          title: t.title,
          date: t.date,
          end_time: t.end_time,
          status: t.status
        })))

        const upcomingWeek = tasksData.filter(t => {
          if (t.status === 'completed') return false
          if (!t.date) return false
          const taskDate = new Date(t.date)
          taskDate.setHours(0, 0, 0, 0)
          return taskDate >= startOfWeek && taskDate <= endOfWeek
        }).length

        const completed = tasksData.filter(t => t.status === 'completed').length
        const completionRate = tasksData.length > 0 ? Math.round((completed / tasksData.length) * 100) : 0

        // Use totalData for the grand total (no filters applied)
        const grandTotal = totalData?.length || 0

        setStats({
          totalTasks: grandTotal, // Grand total of ALL tasks in database
          completedToday,
          pending,
          overdue,
          upcomingWeek,
          completionRate
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tasks stats:', error)
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
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

  const getContactName = (contact: { name?: string; first_name?: string; last_name?: string } | undefined) => {
    if (!contact) return '-'
    if (contact.name) return contact.name
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }
    return '-'
  }

  const getRelatedEntityName = (task: Task) => {
    // Priority: Deal > Contact
    if (task.deal) {
      return task.deal.title || task.deal.name || 'Untitled Deal'
    }
    if (task.contact) {
      return getContactName(task.contact)
    }
    return '-'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isOverdue = (task: Task) => {
    if (task.status === 'completed') return false
    if (!task.date) return false
    return new Date(task.date) < new Date()
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchTasksStats()
    setRefreshing(false)
  }

  // Filter to show only pending and overdue tasks
  const pendingAndOverdueTasks = tasks.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled'
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks & Calendar Overview</h1>
          <p className="text-gray-600 mt-1">Monitor team productivity and task completion</p>
        </div>

        {/* Master Filter Bar */}
        <MasterFilterBar users={users} showSource={false} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">Total in database</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingWeek}</div>
              <p className="text-xs text-muted-foreground">Upcoming tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground">Tasks completed</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Link href="/dashboard/tasks">
            <Button>View All Tasks</Button>
          </Link>
          <Link href="/dashboard/calendar">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Open Team Calendar
            </Button>
          </Link>
          <Link href="/dashboard/tasks?status=overdue">
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              Review Overdue Tasks
            </Button>
          </Link>
        </div>

        {/* Team's Pending Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team's Pending Tasks</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Tasks that are currently "To Do" or "Overdue" across the organization
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading tasks...</div>
              </div>
            ) : pendingAndOverdueTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                <p>All caught up! No pending tasks.</p>
                <Link href="/dashboard/tasks">
                  <Button className="mt-4">Create New Task</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Task Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Related Lead/Deal</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Due Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Assigned To</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAndOverdueTasks.map((task) => (
                      <tr
                        key={task.id}
                        className={`border-b hover:bg-gray-50 transition-colors ${isOverdue(task) ? 'bg-red-50' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {task.title}
                            {isOverdue(task) && (
                              <Badge className="ml-2 bg-red-100 text-red-800">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {getRelatedEntityName(task)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-700">
                            {formatDate(task.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {task.start_time ? (
                              <>
                                {task.start_time}
                                {task.end_time && ` - ${task.end_time}`}
                              </>
                            ) : (
                              '-'
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusBadgeColor(task.status)}>
                            {task.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                {getAssigneeInitials(task.assignee)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-700">
                              {getAssigneeName(task.assignee)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/tasks?id=${task.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingAndOverdueTasks.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600 text-center">
                    Showing {pendingAndOverdueTasks.length} pending/overdue task{pendingAndOverdueTasks.length === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
