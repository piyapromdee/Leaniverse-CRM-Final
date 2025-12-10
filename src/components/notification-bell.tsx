'use client'

import React, { useState, useEffect } from 'react'
import { Bell, X, CheckCheck, Clock, AlertTriangle, Target, Calendar, Trash2, UserCheck, UserX, Users, Check, X as XIcon, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDistanceToNow } from 'date-fns'
import { getUserNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications, type Notification } from '@/lib/notification-system'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Load notifications
  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        getUserNotifications(user.id, 10),
        getUnreadNotificationCount(user.id)
      ])

      // Client-side deduplication based on content and timing
      const deduplicatedNotifications = notificationsData.filter((notification, index, self) => 
        index === self.findIndex(n => 
          n.title === notification.title && 
          n.message === notification.message &&
          n.type === notification.type &&
          Math.abs(new Date(n.created_at!).getTime() - new Date(notification.created_at!).getTime()) < 5 * 60 * 1000 // 5 minutes
        )
      )

      setNotifications(deduplicatedNotifications)
      setUnreadCount(unreadCountData)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    
    // Poll for new notifications every 30 seconds for better responsiveness
    const interval = setInterval(loadNotifications, 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Get notification icon based on type
  const getNotificationIcon = (notification: Notification) => {
    const iconClass = "h-4 w-4"
    
    switch (notification.type) {
      case 'task_assigned':
      case 'task_due_today':
      case 'task_due_tomorrow':
        return <Calendar className={`${iconClass} text-blue-500`} />
      case 'task_overdue':
      case 'activity_missed':
        return <AlertTriangle className={`${iconClass} text-red-500`} />
      case 'deal_assigned':
      case 'deal_high_value':
        return <Target className={`${iconClass} text-green-500`} />
      case 'deal_close_approaching':
        return <Target className={`${iconClass} text-orange-500`} />
      case 'deal_lost':
        return <Target className={`${iconClass} text-red-500`} />
      case 'meeting_today':
        return <Clock className={`${iconClass} text-orange-500`} />
      case 'lead_reassignment_request':
        return <Users className={`${iconClass} text-blue-500`} />
      case 'lead_reassignment_approved':
        return <UserCheck className={`${iconClass} text-green-500`} />
      case 'lead_reassignment_rejected':
        return <UserX className={`${iconClass} text-red-500`} />
      case 'lead_mention':
        return <Bell className={`${iconClass} text-purple-500`} />
      case 'system_alert':
        // Check if it's actually a mention based on the title
        if (notification.title?.includes('mentioned')) {
          return <Bell className={`${iconClass} text-purple-500`} />
        }
        return <Bell className={`${iconClass} text-blue-500`} />
      default:
        return <Bell className={`${iconClass} text-gray-500`} />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50'
      case 'high': return 'border-l-orange-500 bg-orange-50'
      case 'medium': return 'border-l-blue-500 bg-blue-50'
      case 'low': return 'border-l-gray-500 bg-gray-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification, event?: React.MouseEvent) => {
    try {
      console.log('🔍 [NOTIFICATION] Clicking notification:', notification.title, 'is_read:', notification.is_read)
      console.log('🔍 [NOTIFICATION] Action URL:', notification.action_url)
      console.log('🔍 [NOTIFICATION] Entity ID:', notification.entity_id)
      
      if (!notification.is_read) {
        console.log('🔍 [NOTIFICATION] Marking as read...')
        const success = await markNotificationAsRead(notification.id!)
        if (success) {
          console.log('✅ [NOTIFICATION] Successfully marked as read')
          // Update local state immediately for better UX
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          )
          setUnreadCount(prev => Math.max(0, prev - 1))
          
          // Also reload in background to ensure consistency
          setTimeout(loadNotifications, 500)
        } else {
          console.error('❌ [NOTIFICATION] Failed to mark notification as read')
        }
      } else {
        console.log('📖 [NOTIFICATION] Already marked as read')
      }
      
      // Close notification panel after a short delay to allow navigation
      setTimeout(() => setIsOpen(false), 100)
    } catch (error) {
      console.error('Error handling notification click:', error)
      setIsOpen(false)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const success = await markAllNotificationsAsRead(user.id)
      if (success) {
        // Update local state immediately for better UX
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        )
        setUnreadCount(0)
        
        // Also reload in background to ensure consistency
        setTimeout(loadNotifications, 200)
      } else {
        console.error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Clear all notifications
  const handleClearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Show confirmation before clearing
    if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
      return
    }

    try {
      const success = await clearAllNotifications(user.id)
      if (success) {
        // Update local state immediately for better UX
        setNotifications([])
        setUnreadCount(0)
        
        // Also reload in background to ensure consistency
        setTimeout(loadNotifications, 200)
      } else {
        console.error('Failed to clear all notifications')
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error)
    }
  }

  // Handle reassignment approval
  const handleApproveReassignment = async (notification: Notification, event?: React.MouseEvent) => {
    event?.stopPropagation()
    
    if (!notification.metadata?.leadId || !notification.metadata?.requestedUserId) {
      console.error('Missing reassignment metadata')
      return
    }

    try {
      const response = await fetch('/api/leads/reassignment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: notification.metadata.leadId,
          newOwnerId: notification.metadata.requestedUserId,
          notificationId: notification.id
        })
      })

      if (response.ok) {
        // Remove the notification from local state
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
        setUnreadCount(prev => Math.max(0, prev - 1))
        
        // Reload notifications to get latest state
        setTimeout(loadNotifications, 500)
      } else {
        const result = await response.json()
        console.error('Failed to approve reassignment:', result.error)
        alert('Failed to approve reassignment: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error approving reassignment:', error)
      alert('Error approving reassignment. Please try again.')
    }
  }

  // Handle reassignment rejection
  const handleRejectReassignment = async (notification: Notification, event?: React.MouseEvent) => {
    event?.stopPropagation()
    
    try {
      const response = await fetch('/api/leads/reassignment/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notification.id
        })
      })

      if (response.ok) {
        // Remove the notification from local state
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
        setUnreadCount(prev => Math.max(0, prev - 1))
        
        // Reload notifications to get latest state
        setTimeout(loadNotifications, 500)
      } else {
        const result = await response.json()
        console.error('Failed to reject reassignment:', result.error)
        alert('Failed to reject reassignment: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error rejecting reassignment:', error)
      alert('Error rejecting reassignment. Please try again.')
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    console.log('🔄 [NOTIFICATION] Manual refresh triggered')
                    loadNotifications()
                  }}
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Refresh notifications"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkAllAsRead}
                    className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearAll}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 max-h-96 overflow-y-auto overflow-x-hidden">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No notifications yet
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-l-4 ${getPriorityColor(notification.priority)} ${
                      !notification.is_read ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                  >
                    {notification.type === 'lead_reassignment_request' ? (
                      <div className="p-4">
                        <NotificationContent notification={notification} />
                        {/* Approval buttons for reassignment requests */}
                        <div className="flex items-center space-x-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => handleApproveReassignment(notification, e)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleRejectReassignment(notification, e)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XIcon className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : notification.action_url ? (
                      <Link 
                        href={notification.action_url} 
                        className="block p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={(e) => {
                          console.log('🔗 [NOTIFICATION LINK] Clicking link to:', notification.action_url)
                          // Mark as read when clicking the link
                          handleNotificationClick(notification, e)
                        }}
                      >
                        <NotificationContent notification={notification} />
                      </Link>
                    ) : (
                      <div 
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <NotificationContent notification={notification} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
        </Card>
      </PopoverContent>
    </Popover>
  )
}

// Separate component for notification content
const NotificationContent = ({ notification }: { notification: Notification }) => {
  const getNotificationIcon = (notification: Notification) => {
    const iconClass = "h-4 w-4"
    
    switch (notification.type) {
      case 'task_assigned':
      case 'task_due_today':
      case 'task_due_tomorrow':
        return <Calendar className={`${iconClass} text-blue-500`} />
      case 'task_overdue':
      case 'activity_missed':
        return <AlertTriangle className={`${iconClass} text-red-500`} />
      case 'deal_assigned':
      case 'deal_high_value':
        return <Target className={`${iconClass} text-green-500`} />
      case 'deal_close_approaching':
        return <Target className={`${iconClass} text-orange-500`} />
      case 'deal_lost':
        return <Target className={`${iconClass} text-red-500`} />
      case 'meeting_today':
        return <Clock className={`${iconClass} text-orange-500`} />
      case 'lead_reassignment_request':
        return <Users className={`${iconClass} text-blue-500`} />
      case 'lead_reassignment_approved':
        return <UserCheck className={`${iconClass} text-green-500`} />
      case 'lead_reassignment_rejected':
        return <UserX className={`${iconClass} text-red-500`} />
      case 'lead_mention':
        return <Bell className={`${iconClass} text-purple-500`} />
      case 'system_alert':
        // Check if it's actually a mention based on the title
        if (notification.title?.includes('mentioned')) {
          return <Bell className={`${iconClass} text-purple-500`} />
        }
        return <Bell className={`${iconClass} text-blue-500`} />
      default:
        return <Bell className={`${iconClass} text-gray-500`} />
    }
  }

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification)}
      </div>
      <div className="flex-grow min-w-0">
        <p className={`text-sm font-medium break-words ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-600 mt-1 break-words">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.created_at!), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell