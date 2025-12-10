import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id?: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  entity_type: 'deal' | 'task' | 'activity' | 'system' | 'lead'
  entity_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_read: boolean
  action_url?: string
  metadata?: any
  created_at?: string
}

export type NotificationType = 
  | 'task_assigned'
  | 'task_overdue'
  | 'task_due_today'
  | 'task_due_tomorrow'
  | 'deal_assigned'
  | 'deal_stage_changed'
  | 'deal_lost'
  | 'deal_high_value'
  | 'deal_close_approaching'
  | 'activity_missed'
  | 'meeting_today'
  | 'activity_added'
  | 'system_alert'
  | 'lead_reassignment_request'
  | 'lead_reassignment_approved'
  | 'lead_reassignment_rejected'
  | 'lead_mention'

// Notification priority mapping
const NOTIFICATION_PRIORITIES: Record<NotificationType, 'low' | 'medium' | 'high' | 'urgent'> = {
  task_assigned: 'medium',
  task_overdue: 'high',
  task_due_today: 'high',
  task_due_tomorrow: 'medium',
  deal_assigned: 'medium',
  deal_stage_changed: 'medium',
  deal_lost: 'high',
  deal_high_value: 'high',
  deal_close_approaching: 'medium',
  activity_missed: 'high',
  meeting_today: 'urgent',
  activity_added: 'low',
  system_alert: 'medium',
  lead_reassignment_request: 'high',
  lead_reassignment_approved: 'medium',
  lead_reassignment_rejected: 'medium',
  lead_mention: 'medium'
}

// Main notification creation function with duplicate prevention
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  entityType: 'deal' | 'task' | 'activity' | 'system' | 'lead',
  entityId?: string,
  priority?: 'low' | 'medium' | 'high' | 'urgent',
  actionUrl?: string,
  metadata?: any
): Promise<string | null> {
  try {
    const supabase = createClient()
    
    // Enhanced duplicate prevention - check multiple criteria
    const duplicateCheckCriteria = [];
    
    // Check by entity (if provided) - for deal notifications, include metadata for specificity
    if (entityId) {
      const entityCriteria: any = {
        user_id: userId,
        type: type,
        entity_type: entityType,
        entity_id: entityId
      };
      
      duplicateCheckCriteria.push(entityCriteria);
    }
    
    // Also check by exact title and message to catch content duplicates
    duplicateCheckCriteria.push({
      user_id: userId,
      type: type,
      title: title,
      message: message
    });

    // Check for duplicates with type-specific time windows
    let duplicateCheckWindow: number;
    switch (type) {
      case 'deal_close_approaching':
        duplicateCheckWindow = 24 * 60 * 60 * 1000; // 24 hours for deal notifications
        break;
      case 'task_overdue':
      case 'task_due_today':
      case 'task_due_tomorrow':
        duplicateCheckWindow = 8 * 60 * 60 * 1000; // 8 hours for task notifications
        break;
      case 'meeting_today':
        duplicateCheckWindow = 2 * 60 * 60 * 1000; // 2 hours for meeting notifications
        break;
      default:
        duplicateCheckWindow = 60 * 60 * 1000; // 1 hour for other notifications
    }
    
    const checkTimeAgo = new Date(Date.now() - duplicateCheckWindow).toISOString();
    
    for (const criteria of duplicateCheckCriteria) {
      const { data: existingNotifications, error: checkError } = await supabase
        .from('notifications')
        .select('id, created_at')
        .match(criteria)
        .gte('created_at', checkTimeAgo)
        .limit(1);

      if (checkError) {
        // If table doesn't exist, skip duplicate check but continue
        console.warn('⚠️ [NOTIFICATIONS] Could not check for duplicates:', checkError.message);
        break;
      } else if (existingNotifications && existingNotifications.length > 0) {
        console.log('📬 [NOTIFICATIONS] Duplicate notification prevented:', { 
          type, 
          entityId, 
          title: title.substring(0, 50),
          existingCreatedAt: existingNotifications[0].created_at
        });
        return null;
      }
    }
    
    const notification: Omit<Notification, 'id'> = {
      user_id: userId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      priority: priority || NOTIFICATION_PRIORITIES[type],
      is_read: false,
      action_url: actionUrl,
      metadata,
      created_at: new Date().toISOString()
    }

    console.log('📬 [NOTIFICATIONS] Creating notification:', notification)

    // Try to insert into notifications table
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single()

    if (error) {
      if (error.message?.includes('relation "public.notifications" does not exist')) {
        console.warn('⚠️ [NOTIFICATIONS] notifications table does not exist. Please run create_notifications_table.sql')
        console.log('📬 [NOTIFICATIONS] Would have created:', notification)
        return null
      }
      
      // Log more detailed error information
      console.error('⚠️ [NOTIFICATIONS] Failed to create notification:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        notificationType: notification.type,
        userId: notification.user_id
      })
      return null
    }

    console.log('✅ [NOTIFICATIONS] Notification created successfully:', data)
    return data?.id || null

  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Notification creation error:', error)
    return null
  }
}

// Get user notifications
export async function getUserNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('⚠️ [NOTIFICATIONS] Failed to fetch notifications:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error fetching notifications:', error)
    return []
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('📖 [NOTIFICATIONS] Marking notification as read:', notificationId)
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('⚠️ [NOTIFICATIONS] Failed to mark as read:', error)
      return false
    }

    console.log('✅ [NOTIFICATIONS] Successfully marked notification as read:', notificationId)
    return true
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error marking as read:', error)
    return false
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('📖 [NOTIFICATIONS] Marking all notifications as read for user:', userId)
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id')

    if (error) {
      console.error('⚠️ [NOTIFICATIONS] Failed to mark all as read:', error)
      return false
    }

    console.log('✅ [NOTIFICATIONS] Successfully marked all notifications as read. Updated count:', data?.length || 0)
    return true
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error marking all as read:', error)
    return false
  }
}

// Clear all notifications for a user (delete them)
export async function clearAllNotifications(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('🗑️ [NOTIFICATIONS] Clearing all notifications for user:', userId)
    
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select('id')

    if (error) {
      console.error('⚠️ [NOTIFICATIONS] Failed to clear all notifications:', error)
      return false
    }

    console.log('✅ [NOTIFICATIONS] Successfully cleared all notifications. Deleted count:', data?.length || 0)
    return true
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error clearing all notifications:', error)
    return false
  }
}

// Clear duplicate notifications for a specific deal and type
export async function clearDuplicateNotifications(userId: string, type: string, entityId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('🧹 [NOTIFICATIONS] Clearing duplicate notifications for:', { userId, type, entityId })
    
    // Get all notifications for this user, type, and entity, ordered by creation date (newest first)
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('⚠️ [NOTIFICATIONS] Failed to fetch notifications for cleanup:', fetchError)
      return false
    }

    if (!notifications || notifications.length <= 1) {
      console.log('📬 [NOTIFICATIONS] No duplicates found to clear')
      return true
    }

    // Keep the newest notification, delete the rest
    const duplicateIds = notifications.slice(1).map(n => n.id)
    
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', duplicateIds)

    if (deleteError) {
      console.error('⚠️ [NOTIFICATIONS] Failed to delete duplicate notifications:', deleteError)
      return false
    }

    console.log(`✅ [NOTIFICATIONS] Cleared ${duplicateIds.length} duplicate notifications`)
    return true
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error clearing duplicate notifications:', error)
    return false
  }
}

// Clean up ALL duplicate notifications for a user
export async function cleanupAllDuplicateNotifications(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    console.log('🧹 [NOTIFICATIONS] Starting cleanup of ALL duplicate notifications for user:', userId)
    
    // Get all notifications grouped by type and entity_id
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, type, entity_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('⚠️ [NOTIFICATIONS] Failed to fetch notifications for bulk cleanup:', fetchError)
      return false
    }

    if (!notifications || notifications.length === 0) {
      console.log('📬 [NOTIFICATIONS] No notifications found')
      return true
    }

    // Group notifications by type and entity_id
    const groupedNotifications = new Map<string, typeof notifications>()
    
    for (const notification of notifications) {
      const key = `${notification.type}:${notification.entity_id || 'no-entity'}`
      if (!groupedNotifications.has(key)) {
        groupedNotifications.set(key, [])
      }
      groupedNotifications.get(key)!.push(notification)
    }

    // Find duplicates and collect IDs to delete
    const idsToDelete: string[] = []
    let duplicatesFound = 0

    for (const [key, group] of groupedNotifications) {
      if (group.length > 1) {
        // Keep the newest (first in sorted array), mark rest for deletion
        const duplicates = group.slice(1)
        idsToDelete.push(...duplicates.map(n => n.id))
        duplicatesFound += duplicates.length
        console.log(`🔍 [NOTIFICATIONS] Found ${duplicates.length} duplicates for ${key}`)
      }
    }

    if (idsToDelete.length === 0) {
      console.log('✅ [NOTIFICATIONS] No duplicate notifications found')
      return true
    }

    // Delete all duplicate notifications
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      console.error('⚠️ [NOTIFICATIONS] Failed to delete duplicate notifications:', deleteError)
      return false
    }

    console.log(`✅ [NOTIFICATIONS] Successfully cleaned up ${duplicatesFound} duplicate notifications`)
    return true
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error during bulk cleanup:', error)
    return false
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('⚠️ [NOTIFICATIONS] Failed to get unread count:', error)
      return 0
    }

    console.log('📊 [NOTIFICATIONS] Unread count for user', userId, ':', count || 0)
    return count || 0
  } catch (error) {
    console.error('⚠️ [NOTIFICATIONS] Error getting unread count:', error)
    return 0
  }
}

// Notification generators for common scenarios
export const NotificationGenerator = {
  // Task notifications
  taskAssigned: (userId: string, taskTitle: string, taskId: string, assignedBy: string) =>
    createNotification(
      userId,
      'task_assigned',
      'New Task Assigned',
      `You have been assigned a new task: "${taskTitle}" by ${assignedBy}`,
      'task',
      taskId,
      undefined, // priority will be determined automatically
      `/dashboard/tasks`,
      { assigned_by: assignedBy }
    ),

  taskOverdue: (userId: string, taskTitle: string, taskId: string, daysPastDue: number) =>
    createNotification(
      userId,
      'task_overdue',
      'Task Overdue',
      `Task "${taskTitle}" is ${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue`,
      'task',
      taskId,
      undefined, // priority will be determined automatically
      `/dashboard/tasks`,
      { days_past_due: daysPastDue }
    ),

  taskDueToday: (userId: string, taskTitle: string, taskId: string) =>
    createNotification(
      userId,
      'task_due_today',
      'Task Due Today',
      `Task "${taskTitle}" is due today`,
      'task',
      taskId,
      undefined, // priority will be determined automatically
      `/dashboard/tasks`,
      {}
    ),

  taskDueTomorrow: (userId: string, taskTitle: string, taskId: string) =>
    createNotification(
      userId,
      'task_due_tomorrow',
      'Task Due Tomorrow',
      `Task "${taskTitle}" is due tomorrow`,
      'task',
      taskId,
      undefined, // priority will be determined automatically
      `/dashboard/tasks`,
      {}
    ),

  // Deal notifications
  dealAssigned: (userId: string, dealTitle: string, dealId: string, assignedBy: string) =>
    createNotification(
      userId,
      'deal_assigned',
      'New Deal Assigned',
      `You have been assigned a new deal: "${dealTitle}" by ${assignedBy}`,
      'deal',
      dealId,
      undefined, // priority will be determined automatically
      `/dashboard/deals/${dealId}`,
      { assigned_by: assignedBy }
    ),

  dealLost: (userId: string, dealTitle: string, dealId: string, value: number) =>
    createNotification(
      userId,
      'deal_lost',
      'Deal Lost',
      `Deal "${dealTitle}" (฿${value.toLocaleString()}) has been marked as lost`,
      'deal',
      dealId,
      undefined, // priority will be determined automatically
      `/dashboard/deals/${dealId}`,
      { value }
    ),

  dealHighValue: (userId: string, dealTitle: string, dealId: string, value: number) =>
    createNotification(
      userId,
      'deal_high_value',
      'High-Value Deal',
      `High-value deal "${dealTitle}" (฿${value.toLocaleString()}) requires attention`,
      'deal',
      dealId,
      undefined, // priority will be determined automatically
      `/dashboard/deals/${dealId}`,
      { value }
    ),

  dealCloseApproaching: async (userId: string, dealTitle: string, dealId: string, daysUntilClose: number) => {
    // First, clear any existing duplicates for this deal
    const supabase = createClient()
    
    console.log('🧹 [NOTIFICATIONS] Clearing duplicate deal notifications for:', { userId, dealId })
    
    // Get all notifications for this deal, ordered by creation date (newest first)
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('type', 'deal_close_approaching')
      .eq('entity_id', dealId)
      .order('created_at', { ascending: false })

    if (!fetchError && notifications && notifications.length > 0) {
      // Delete all existing notifications for this deal - we'll create a fresh one
      const duplicateIds = notifications.map(n => n.id)
      
      await supabase
        .from('notifications')
        .delete()
        .in('id', duplicateIds)

      console.log(`✅ [NOTIFICATIONS] Cleared ${duplicateIds.length} existing deal notifications`)
    }
    
    // Then create the new notification
    return createNotification(
      userId,
      'deal_close_approaching',
      'Deal Close Date Approaching',
      `Deal "${dealTitle}" is scheduled to close in ${daysUntilClose} day${daysUntilClose === 1 ? '' : 's'}`,
      'deal',
      dealId,
      undefined, // priority will be determined automatically
      `/dashboard/deals/${dealId}`,
      { days_until_close: daysUntilClose }
    )
  },

  // Meeting/Activity notifications
  meetingToday: (userId: string, meetingTitle: string, meetingTime: string, taskId: string) =>
    createNotification(
      userId,
      'meeting_today',
      'Meeting Today',
      `You have a meeting today: "${meetingTitle}" at ${meetingTime}`,
      'activity',
      taskId,
      undefined, // priority will be determined automatically
      `/dashboard/tasks`,
      { meeting_time: meetingTime }
    ),

  activityMissed: (userId: string, activityTitle: string, taskId: string) =>
    createNotification(
      userId,
      'activity_missed',
      'Missed Activity',
      `You missed the activity: "${activityTitle}"`,
      'activity',
      taskId,
      undefined, // priority will be determined automatically
      `/dashboard/tasks`,
      {}
    )
}