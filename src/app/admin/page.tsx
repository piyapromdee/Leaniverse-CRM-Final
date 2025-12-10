'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import MasterFilterBar from '@/components/MasterFilterBar'
import { useMasterFilter } from '@/contexts/MasterFilterContext'
import {
  Users,
  TrendingUp,
  Target,
  Briefcase,
  AlertTriangle,
  Activity,
  Calendar,
  CheckSquare,
  Clock,
  Trophy,
  BarChart3,
  ArrowUpRight,
  Loader2,
  Star
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface TeamMetrics {
  totalRevenue: number
  targetRevenue: number
  totalDeals: number
  targetDeals: number
  totalLeads: number
  targetLeads: number
  activeDealsCount: number
  wonDealsCount: number
  lostDealsCount: number
  pipelineValue: number
  overdueTasksCount: number
  teamMembersCount: number
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  revenue: number
  deals_closed: number
}

interface TeamTask {
  id: number
  title: string
  date: string
  start_time?: string
  status: string
  assigned_to: string
  assignee?: {
    first_name: string
    last_name: string
  }
}

interface TeamActivity {
  id: string
  action_type: string
  entity_title: string
  description: string
  created_at: string
  user_name: string
  user_id: string
}

const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  try {
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    return timeString;
  }
}

// KPI Card Component (matching Sales Dashboard)
const KpiCard = ({ title, value, description, icon: Icon, href, colorScheme }: any) => (
  <Link href={href} className="block h-full">
    <Card className="h-full bg-white hover:shadow-md hover:scale-[1.01] transition-all duration-200 group border border-gray-100 overflow-hidden flex flex-col p-0">
      <div className={`p-2 ${colorScheme.header}`}>
        <div className="flex items-center">
          <Icon className={`h-4 w-4 ${colorScheme.icon} mr-2`} />
          <h3 className={`text-xs font-semibold ${colorScheme.text}`}>{title}</h3>
        </div>
      </div>
      <div className="p-3 flex-grow flex flex-col justify-center">
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </Card>
  </Link>
)

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

export default function AdminDashboard() {
  const { masterTimePeriod, masterAssignee, masterSource, getDateRange } = useMasterFilter()
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null)
  const [topPerformers, setTopPerformers] = useState<TeamMember[]>([])
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([])
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'all_time' | 'this_month' | 'this_quarter' | 'last_30_days'>('all_time')

  useEffect(() => {
    fetchTeamData()
    fetchUsers()
  }, [dateRange, masterTimePeriod, masterAssignee, masterSource])

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

  const fetchTeamData = async () => {
    setLoading(true)

    try {
      const { startDate, endDate } = getDateRange()
      // Convert dates to ISO strings for API
      const startDateStr = startDate ? startDate.toISOString() : null
      const endDateStr = endDate.toISOString()

      // Fetch team metrics, top performers, tasks, and activity in parallel
      const [metricsRes, performersRes, tasksRes, activityRes] = await Promise.all([
        fetch(`/api/admin/team-metrics?dateRange=${dateRange}&startDate=${startDateStr}&endDate=${endDateStr}&assignee=${masterAssignee}&source=${masterSource}`),
        fetch(`/api/admin/team-performers?dateRange=${dateRange}&startDate=${startDateStr}&endDate=${endDateStr}&assignee=${masterAssignee}&source=${masterSource}`),
        fetch(`/api/admin/team-tasks?dateRange=${dateRange}&startDate=${startDateStr}&endDate=${endDateStr}&assignee=${masterAssignee}`),
        fetch(`/api/admin/team-activity?dateRange=${dateRange}&startDate=${startDateStr}&endDate=${endDateStr}&assignee=${masterAssignee}&source=${masterSource}`)
      ])

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data.metrics)
      }

      if (performersRes.ok) {
        const data = await performersRes.json()
        setTopPerformers(data.performers || [])
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTeamTasks(data.tasks || [])
      }

      if (activityRes.ok) {
        const data = await activityRes.json()
        setTeamActivity(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading team dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const revenueProgress = metrics ? (metrics.totalRevenue / metrics.targetRevenue) * 100 : 0
  const dealsProgress = metrics ? (metrics.totalDeals / metrics.targetDeals) * 100 : 0
  const leadsProgress = metrics ? (metrics.totalLeads / metrics.targetLeads) * 100 : 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">Team performance and company-wide metrics</p>
        </div>

        {/* Master Filter Bar */}
        <MasterFilterBar users={users} />

        {/* KPI Cards - Matching Sales Dashboard 5-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            title="Team Members"
            value={metrics?.teamMembersCount || 0}
            description="Active sales reps"
            icon={Users}
            href="/admin/users"
            colorScheme={{ header: 'bg-teal-50', text: 'text-teal-800', icon: 'text-teal-600' }}
          />
          <KpiCard
            title="Active Deals"
            value={metrics?.activeDealsCount || 0}
            description="Deals in progress"
            icon={Briefcase}
            href="/dashboard/deals?status=active"
            colorScheme={{ header: 'bg-purple-50', text: 'text-purple-800', icon: 'text-purple-600' }}
          />
          <KpiCard
            title="Pipeline Value"
            value={formatCurrency(metrics?.pipelineValue || 0)}
            description="Total pipeline"
            icon={Target}
            href="/dashboard/deals"
            colorScheme={{ header: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-600' }}
          />
          <KpiCard
            title="Deals Won"
            value={metrics?.wonDealsCount || 0}
            description="Closed this month"
            icon={TrendingUp}
            href="/dashboard/deals?status=won"
            colorScheme={{ header: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' }}
          />
          <KpiCard
            title="Overdue Tasks"
            value={metrics?.overdueTasksCount || 0}
            description="Team tasks overdue"
            icon={AlertTriangle}
            href="/dashboard/tasks?status=overdue"
            colorScheme={{ header: 'bg-orange-50', text: 'text-orange-800', icon: 'text-orange-600' }}
          />
        </div>

        {/* Main Content Grid - 3 columns like Sales Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section: Team Sales Forecast */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Sales Forecast Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-600" />
                  Team Sales Forecast
                </CardTitle>
                <CardDescription>Company-wide targets vs actual performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Revenue Target */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Revenue Target</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(metrics?.totalRevenue || 0)} / {formatCurrency(metrics?.targetRevenue || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${Math.min(revenueProgress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{revenueProgress.toFixed(0)}% of target</p>
                  </div>

                  {/* Deals Target */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Deals Target</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {metrics?.totalDeals || 0} / {metrics?.targetDeals || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{ width: `${Math.min(dealsProgress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{dealsProgress.toFixed(0)}% of target</p>
                  </div>

                  {/* Leads Target */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Leads Target</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {metrics?.totalLeads || 0} / {metrics?.targetLeads || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-teal-600 h-2.5 rounded-full"
                        style={{ width: `${Math.min(leadsProgress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{leadsProgress.toFixed(0)}% of target</p>
                  </div>

                  {/* Win/Loss Summary */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="text-2xl font-bold text-green-600">{metrics?.wonDealsCount || 0}</p>
                        <p className="text-xs text-gray-500">Won</p>
                      </div>
                      <div className="text-center flex-1 border-l">
                        <p className="text-2xl font-bold text-red-600">{metrics?.lostDealsCount || 0}</p>
                        <p className="text-xs text-gray-500">Lost</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Tasks Overview */}
            <Card className="h-full bg-white border border-gray-100 shadow-sm flex flex-col">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 mr-3" />
                    Team Upcoming Tasks
                  </div>
                  {teamTasks.filter(t => t.status !== 'completed').length > 0 && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                      {teamTasks.filter(t => t.status !== 'completed').length} pending
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-grow overflow-y-auto max-h-80">
                {teamTasks.length > 0 ? (
                  <ul className="space-y-3">
                    {teamTasks.slice(0, 10).map((task) => (
                      <li key={`task-${task.id}`} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <CheckSquare className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="flex-grow">
                          <p className="text-sm font-medium text-gray-800">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            {task.assignee && (
                              <span className="text-teal-600 font-semibold">
                                {task.assignee.first_name} {task.assignee.last_name}
                              </span>
                            )}
                            {task.date && format(new Date(task.date), 'MMM dd')}
                            {task.start_time && (
                              <span className="text-blue-600 font-semibold">{formatTime(task.start_time)}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-10 h-full flex flex-col justify-center items-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No upcoming team tasks!</p>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t mt-auto flex-shrink-0">
                <Link href="/dashboard/tasks">
                  <Button variant="outline" className="w-full">View All Tasks</Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Right Section: Team Performance & Activity */}
          <div className="space-y-6">
            {/* Team Performance Leaderboard */}
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
                  <div className="flex items-center">
                    <Trophy className="h-5 w-5 text-yellow-500 mr-3" />
                    Top Performers
                  </div>
                  <span className="text-xs font-normal text-gray-500">By Revenue</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {topPerformers.slice(0, 5).map((member, index) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{member.deals_closed || 0} deals closed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-0.5">Total Revenue</p>
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(member.revenue || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No performance data yet</p>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t">
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full">View All Team Members</Button>
                </Link>
              </div>
            </Card>

            {/* Team Recent Activity */}
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
                  <Activity className="h-5 w-5 text-blue-500 mr-3" />
                  Team Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 max-h-96 overflow-y-auto">
                {teamActivity.length > 0 ? (
                  <div className="space-y-3">
                    {teamActivity.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-teal-600" />
                          </div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs text-gray-800">
                            <span className="font-semibold text-teal-600">
                              {activity.user_name || 'Unknown User'}
                            </span>{' '}
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No recent activity</p>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t">
                <Link href="/admin/activity">
                  <Button variant="outline" className="w-full">View All Activity</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
