'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, Target, CheckSquare, Phone, Calendar, Mail, ArrowLeft, Activity, TrendingUp, Clock, Users } from 'lucide-react'
import PageHeader from '@/components/page-header'

// Sample data for open deals and their related activities
const openDealsData = [
  {
    id: 1,
    company: 'TechCorp Solutions',
    contact: 'John Smith',
    value: 850000,
    stage: 'Qualified',
    priority: 'High',
    closeDate: '2025-02-15',
    activities: [
      { id: 1, type: 'task', title: 'Follow up with TechCorp Solutions', dueDate: '2025-01-18', dueTime: '10:00 AM', status: 'pending', priority: 'High' },
      { id: 2, type: 'call', title: 'Called John Smith', completedDate: '2025-01-16', description: 'Discussed contract details and timeline', status: 'completed' },
      { id: 3, type: 'task', title: 'Prepare contract proposal', dueDate: '2025-01-20', dueTime: '2:00 PM', status: 'pending', priority: 'High' },
      { id: 4, type: 'email', title: 'Sent pricing breakdown', completedDate: '2025-01-15', description: 'Detailed pricing for enterprise package', status: 'completed' }
    ]
  },
  {
    id: 2,
    company: 'Innovation Labs',
    contact: 'Mike Chen',
    value: 425000,
    stage: 'Proposal & Follow-up',
    priority: 'High',
    closeDate: '2025-03-01',
    activities: [
      { id: 5, type: 'task', title: 'Send proposal to Innovation Labs', dueDate: '2025-01-20', dueTime: '2:00 PM', status: 'pending', priority: 'Medium' },
      { id: 6, type: 'meeting', title: 'Demo with Innovation Labs', dueDate: '2025-01-18', dueTime: '2:00 PM', status: 'pending', priority: 'High' },
      { id: 7, type: 'call', title: 'Discovery call with Mike Chen', completedDate: '2025-01-14', description: 'Discussed technical requirements', status: 'completed' }
    ]
  },
  {
    id: 3,
    company: 'Global Enterprise Inc',
    contact: 'Alex Rodriguez',
    value: 1200000,
    stage: 'Qualified',
    priority: 'High',
    closeDate: '2025-04-15',
    activities: [
      { id: 8, type: 'task', title: 'Schedule demo for Global Enterprise', dueDate: '2025-01-22', dueTime: '9:00 AM', status: 'pending', priority: 'Medium' },
      { id: 9, type: 'call', title: 'Initial call with Alex Rodriguez', completedDate: '2025-01-17', description: 'Multi-region deployment discussion', status: 'completed' }
    ]
  },
  {
    id: 4,
    company: 'StartupX',
    contact: 'Lisa Wong',
    value: 125000,
    stage: 'Lead',
    priority: 'Medium',
    closeDate: '2025-02-20',
    activities: [
      { id: 10, type: 'task', title: 'Follow up with StartupX', dueDate: '2025-01-19', dueTime: '11:00 AM', status: 'pending', priority: 'Low' },
      { id: 11, type: 'email', title: 'Sent introduction email', completedDate: '2025-01-16', description: 'Company overview and capabilities', status: 'completed' }
    ]
  }
]

export default function OpenDealsSummaryPage() {
  const [deals] = useState(openDealsData)
  const router = useRouter()

  // Calculate summary statistics
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)
  const totalActivities = deals.reduce((sum, deal) => sum + deal.activities.length, 0)
  const pendingTasks = deals.reduce((sum, deal) => 
    sum + deal.activities.filter(activity => activity.status === 'pending').length, 0
  )
  const completedActivities = deals.reduce((sum, deal) => 
    sum + deal.activities.filter(activity => activity.status === 'completed').length, 0
  )

  // Get all activities sorted by due date/completion date
  const allActivities = deals.flatMap(deal => 
    deal.activities.map(activity => ({
      ...activity,
      dealCompany: deal.company,
      dealContact: deal.contact,
      dealValue: deal.value,
      dealStage: deal.stage
    }))
  ).sort((a, b) => {
    const dateA = new Date(a.dueDate || a.completedDate || new Date())
    const dateB = new Date(b.dueDate || b.completedDate || new Date())
    return dateA.getTime() - dateB.getTime()
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckSquare
      case 'call': return Phone
      case 'meeting': return Calendar
      case 'email': return Mail
      default: return Activity
    }
  }

  const getActivityColor = (type: string, status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-800'
    
    switch (type) {
      case 'task': return 'bg-orange-100 text-orange-800'
      case 'call': return 'bg-blue-100 text-blue-800'
      case 'meeting': return 'bg-purple-100 text-purple-800'
      case 'email': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const isToday = (dateString: string) => {
    return new Date(dateString).toDateString() === new Date().toDateString()
  }

  return (
    <>
      <PageHeader 
        title="My Open Deals Value"
        description="Task activities and progress tracking for all open deals in your pipeline"
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Total Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-green-600 mt-1">{deals.length} open deals</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Total Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{totalActivities}</div>
              <p className="text-xs text-blue-600 mt-1">All deal activities</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">{pendingTasks}</div>
              <p className="text-xs text-orange-600 mt-1">Need attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{completedActivities}</div>
              <p className="text-xs text-purple-600 mt-1">Activities done</p>
            </CardContent>
          </Card>
        </div>

        {/* Open Deals Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-teal-600" />
              <span>Open Deals Overview</span>
            </CardTitle>
            <CardDescription>All deals currently in your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deals.map((deal) => (
                <div key={deal.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Target className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{deal.company}</h4>
                        <p className="text-sm text-gray-600">{deal.contact}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">{formatCurrency(deal.value)}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {deal.stage}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(deal.priority)}`}
                        >
                          {deal.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Close Date: {formatDate(deal.closeDate)} • {deal.activities.length} activities
                  </div>
                  <div className="text-sm text-gray-600">
                    {deal.activities.filter(a => a.status === 'pending').length} pending tasks, {' '}
                    {deal.activities.filter(a => a.status === 'completed').length} completed
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-teal-600" />
              <span>Activity Timeline</span>
            </CardTitle>
            <CardDescription>All task activities related to your open deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type, activity.status)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {activity.type}
                          </Badge>
                          {activity.status === 'pending' && activity.priority && (
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(activity.priority)}`}>
                              {activity.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.status === 'pending' ? (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span className={activity.dueDate && isOverdue(activity.dueDate) ? 'text-red-600 font-medium' : 
                                             activity.dueDate && isToday(activity.dueDate) ? 'text-orange-600 font-medium' : ''}>
                                {activity.dueDate ? formatDate(activity.dueDate) : 'No date'} {activity.dueTime || ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-green-600">Completed {activity.completedDate ? formatDate(activity.completedDate) : ''}</span>
                          )}
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
                          <Target className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{activity.dealStage}</span>
                        </div>
                      </div>
                      
                      {activity.description && (
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}