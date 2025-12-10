'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  description: string
  created_at: string
  action_type: string
}

export function RecentActivityWidget() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const supabase = createClient()
        
        // First, try to get actual activity logs from the database
        const { data: activityLogs } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (activityLogs && activityLogs.length > 0) {
          // Use actual activity logs if available
          const mappedActivities: ActivityItem[] = activityLogs.map(log => ({
            id: log.id,
            description: log.description,
            created_at: log.created_at,
            action_type: log.action_type
          }))
          setActivities(mappedActivities)
          setIsLoading(false)
          return
        }
        
        // Fallback: Try to get data from multiple sources
        const [dealsResponse, tasksResponse] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/tasks')
        ])
        
        const dealsData = await dealsResponse.json()
        const tasksData = await tasksResponse.json()
        
        // Create activities from recent data
        const recentActivities: ActivityItem[] = []
        
        // Add recent deals
        if (dealsData.deals) {
          dealsData.deals.slice(0, 5).forEach((deal: any) => {
            recentActivities.push({
              id: `deal-${deal.id}`,
              description: `Created deal: ${deal.title} (฿${deal.value?.toLocaleString() || 0})`,
              created_at: deal.created_at,
              action_type: 'deal_created'
            })
          })
        }
        
        // Add recent tasks
        if (tasksData.tasks) {
          tasksData.tasks.slice(0, 5).forEach((task: any) => {
            recentActivities.push({
              id: `task-${task.id}`,
              description: `${task.status === 'completed' ? 'Completed' : 'Created'} task: ${task.title}`,
              created_at: task.created_at || task.date,
              action_type: task.status === 'completed' ? 'task_completed' : 'task_created'
            })
          })
        }
        
        // Sort by date and take most recent (show more activities)
        const sortedActivities = recentActivities
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20) // Show more activities
        
        setActivities(sortedActivities)
      } catch (error) {
        console.error('Error loading activities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadActivities()
  }, [])

  console.log('RecentActivityWidget - Activities loaded:', activities.length)
  
  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
          <Activity className="h-5 w-5 text-gray-500 mr-3" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">Activities will appear here as you work</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-400 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}