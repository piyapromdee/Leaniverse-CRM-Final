'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Target, TrendingUp, DollarSign, Activity, Calendar, Phone, Plus, Award, UserCheck, Clock, Building } from 'lucide-react'

// Enhanced team sales data for Owner view
const teamSalesData = {
  totalTeamDeals: 3875000,
  teamConversionRate: 28.5,
  activeTeamMembers: 4,
  teamDealsThisMonth: 12,
  teamMembers: [
    {
      id: 1,
      name: 'John Doe',
      role: 'Senior Sales Rep',
      dealsWon: 3,
      totalValue: 1250000,
      conversionRate: 35,
      tasksCompleted: 18,
      callsMade: 45,
      avatar: 'JD'
    },
    {
      id: 2,
      name: 'Jane Smith',
      role: 'Sales Manager',
      dealsWon: 4,
      totalValue: 1650000,
      conversionRate: 42,
      tasksCompleted: 22,
      callsMade: 38,
      avatar: 'JS'
    },
    {
      id: 3,
      name: 'Mike Johnson',
      role: 'Account Manager',
      dealsWon: 2,
      totalValue: 575000,
      conversionRate: 25,
      tasksCompleted: 15,
      callsMade: 32,
      avatar: 'MJ'
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      role: 'Business Development',
      dealsWon: 3,
      totalValue: 400000,
      conversionRate: 30,
      tasksCompleted: 20,
      callsMade: 55,
      avatar: 'SW'
    }
  ],
  teamActivities: [
    { id: 1, member: 'Jane Smith', action: 'Closed deal', detail: 'Enterprise Package - Digital Corp (฿850K)', time: '1 hour ago', type: 'win' },
    { id: 2, member: 'John Doe', action: 'Created task', detail: 'Follow up with TechCorp Solutions', time: '2 hours ago', type: 'task' },
    { id: 3, member: 'Sarah Wilson', action: 'Called', detail: 'Discovery call with Innovation Labs', time: '3 hours ago', type: 'call' },
    { id: 4, member: 'Mike Johnson', action: 'Sent proposal', detail: 'CRM Implementation - StartupX', time: '4 hours ago', type: 'proposal' },
    { id: 5, member: 'Jane Smith', action: 'Meeting scheduled', detail: 'Demo with Global Enterprise Inc', time: '5 hours ago', type: 'meeting' },
    { id: 6, member: 'John Doe', action: 'Updated deal', detail: 'Moved TechCorp to Proposal stage', time: '6 hours ago', type: 'update' }
  ],
  teamAppointments: [
    { id: 1, member: 'Jane Smith', title: 'Product Demo - Enterprise Corp', date: '2025-01-18', time: '10:00 AM', contact: 'Enterprise Corp' },
    { id: 2, member: 'John Doe', title: 'Follow-up Call - TechCorp', date: '2025-01-18', time: '2:00 PM', contact: 'TechCorp Solutions' },
    { id: 3, member: 'Sarah Wilson', title: 'Discovery Meeting - Innovation Labs', date: '2025-01-19', time: '11:00 AM', contact: 'Innovation Labs' },
    { id: 4, member: 'Mike Johnson', title: 'Contract Review - StartupX', date: '2025-01-19', time: '3:00 PM', contact: 'StartupX' },
    { id: 5, member: 'Jane Smith', title: 'Quarterly Review - Global Enterprise', date: '2025-01-20', time: '9:00 AM', contact: 'Global Enterprise' }
  ],
  topPerformers: [
    { name: 'Jane Smith', deals: 4, value: 1650000, growth: '+25%' },
    { name: 'John Doe', deals: 3, value: 1250000, growth: '+18%' },
    { name: 'Sarah Wilson', deals: 3, value: 400000, growth: '+12%' }
  ]
}

export default function OwnerSalesDashboard() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false)
  const [quickActionType, setQuickActionType] = useState<'task' | 'meeting' | null>(null)
  const [quickActionData, setQuickActionData] = useState({
    assignee: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium'
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkOwnerAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/sign-in')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'owner') {
          router.push('/dashboard') // Redirect non-owners to main dashboard
          return
        }

        setUserRole(profile.role)
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking role:', error)
        router.push('/dashboard')
      }
    }

    checkOwnerAccess()
  }, [supabase, router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleQuickAction = () => {
    console.log('Creating quick action:', quickActionType, quickActionData)
    alert(`${quickActionType === 'task' ? 'Task' : 'Meeting'} assigned to ${quickActionData.assignee} successfully!`)
    
    setQuickActionData({
      assignee: '',
      title: '',
      description: '',
      dueDate: '',
      priority: 'Medium'
    })
    setIsQuickActionModalOpen(false)
    setQuickActionType(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  if (userRole !== 'owner') {
    return null
  }

return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Sales Dashboard</h1>
            <p className="text-gray-600">Complete overview of your sales team performance and activities</p>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={() => {
                setQuickActionType('task')
                setIsQuickActionModalOpen(true)
              }}
              variant="outline" 
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign Task
            </Button>
            <Button 
              onClick={() => {
                setQuickActionType('meeting')
                setIsQuickActionModalOpen(true)
              }}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        {/* Team Performance KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Team Pipeline</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(teamSalesData.totalTeamDeals)}</div>
              <p className="text-xs text-green-600">+22% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamSalesData.teamConversionRate}%</div>
              <p className="text-xs text-green-600">+3.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamSalesData.activeTeamMembers}</div>
              <p className="text-xs text-blue-600">All members active today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deals Closed This Month</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamSalesData.teamDealsThisMonth}</div>
              <p className="text-xs text-green-600">+4 deals from last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Member Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-teal-600" />
                <span>Team Member Performance</span>
              </CardTitle>
              <CardDescription>Individual performance metrics for each team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamSalesData.teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member.avatar}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-600">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-gray-900">{member.dealsWon}</p>
                          <p className="text-xs text-gray-500">Deals</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">{formatCurrency(member.totalValue)}</p>
                          <p className="text-xs text-gray-500">Value</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-blue-600">{member.conversionRate}%</p>
                          <p className="text-xs text-gray-500">Conv. Rate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Team Activity Feed</span>
              </CardTitle>
              <CardDescription>Real-time feed of all team member activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamSalesData.teamActivities.map((activity) => {
                  const getActivityColor = (type: string) => {
                    switch (type) {
                      case 'win': return 'bg-green-100 text-green-800'
                      case 'call': return 'bg-blue-100 text-blue-800'
                      case 'proposal': return 'bg-purple-100 text-purple-800'
                      case 'meeting': return 'bg-orange-100 text-orange-800'
                      case 'task': return 'bg-yellow-100 text-yellow-800'
                      default: return 'bg-gray-100 text-gray-800'
                    }
                  }

                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'win': return Target
                      case 'call': return Phone
                      case 'proposal': return Building
                      case 'meeting': return Calendar
                      case 'task': return UserCheck
                      default: return Activity
                    }
                  }

                  const Icon = getActivityIcon(activity.type)

                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{activity.member}</span>
                          <span className="text-sm text-gray-600">{activity.action}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{activity.detail}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Appointments & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Team Appointments</span>
              </CardTitle>
              <CardDescription>Upcoming meetings and calls across the entire team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamSalesData.teamAppointments.map((appointment) => {
                  const appointmentDate = new Date(appointment.date)
                  const today = new Date()
                  const isToday = appointmentDate.toDateString() === today.toDateString()
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                        <p className="text-sm text-blue-600 font-medium">{appointment.member}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {isToday ? 'Today' : appointmentDate.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })} at {appointment.time}
                          </span>
                        </div>
                      </div>
                      {isToday && (
                        <Badge className="bg-orange-100 text-orange-800">Today</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span>Top Performers This Month</span>
              </CardTitle>
              <CardDescription>Leading team members by deals closed and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamSalesData.topPerformers.map((performer, index) => (
                  <div key={performer.name} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{performer.name}</h4>
                        <p className="text-sm text-gray-600">{performer.deals} deals closed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(performer.value)}</p>
                      <p className="text-sm text-green-600">{performer.growth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Modal */}
        <Dialog open={isQuickActionModalOpen} onOpenChange={setIsQuickActionModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {quickActionType === 'task' ? (
                  <UserCheck className="w-5 h-5 text-blue-600" />
                ) : (
                  <Calendar className="w-5 h-5 text-teal-600" />
                )}
                <span>{quickActionType === 'task' ? 'Assign Task to Team Member' : 'Schedule Team Meeting'}</span>
              </DialogTitle>
              <DialogDescription>
                {quickActionType === 'task' ? 'Assign a task to a team member and set priority' : 'Schedule a meeting with your team'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="assignee">Assign to Team Member</Label>
                <Select value={quickActionData.assignee} onValueChange={(value) => setQuickActionData({...quickActionData, assignee: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamSalesData.teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.name}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="title">{quickActionType === 'task' ? 'Task' : 'Meeting'} Title</Label>
                <Input
                  id="title"
                  value={quickActionData.title}
                  onChange={(e) => setQuickActionData({...quickActionData, title: e.target.value})}
                  placeholder={quickActionType === 'task' ? 'Task description' : 'Meeting title'}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quickActionData.description}
                  onChange={(e) => setQuickActionData({...quickActionData, description: e.target.value})}
                  placeholder={quickActionType === 'task' ? 'Additional task details' : 'Meeting agenda and objectives'}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">{quickActionType === 'task' ? 'Due Date' : 'Meeting Date'}</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={quickActionData.dueDate}
                    onChange={(e) => setQuickActionData({...quickActionData, dueDate: e.target.value})}
                  />
                </div>
                {quickActionType === 'task' && (
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={quickActionData.priority} onValueChange={(value) => setQuickActionData({...quickActionData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={() => setIsQuickActionModalOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleQuickAction} 
                  className={`flex-1 ${quickActionType === 'task' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-teal-500 hover:bg-teal-600'}`}
                  disabled={!quickActionData.assignee || !quickActionData.title}
                >
                  {quickActionType === 'task' ? 'Assign Task' : 'Schedule Meeting'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  )
}