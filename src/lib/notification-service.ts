import { createClient } from '@/lib/supabase/client'
import { NotificationGenerator } from '@/lib/notification-system'
import { differenceInDays, isToday, isTomorrow, isPast } from 'date-fns'

// Service to automatically generate notifications based on CRM data
export class NotificationService {
  private supabase = createClient()

  // Check for overdue tasks and generate notifications
  async checkOverdueTasks() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      // Get all active tasks that are past due
      const { data: overdueTasks, error } = await this.supabase
        .from('calendar_events')
        .select('*')
        .neq('status', 'completed')
        .lt('date', new Date().toISOString().split('T')[0])

      if (error) {
        console.error('Error fetching overdue tasks:', error)
        return
      }

      // Create notifications for overdue tasks (only once per task per day)
      for (const task of overdueTasks || []) {
        const daysPastDue = differenceInDays(new Date(), new Date(task.date))
        
        // Only notify for significant milestones: 1 day, 1 week, 2 weeks, 1 month
        const notificationDays = [1, 7, 14, 30]
        if (notificationDays.includes(daysPastDue)) {
          await NotificationGenerator.taskOverdue(
            task.user_id,
            task.title,
            task.id.toString(),
            daysPastDue
          )
        }
      }

      console.log(`📬 [NOTIFICATIONS] Checked ${overdueTasks?.length || 0} overdue tasks`)

    } catch (error) {
      console.error('Error checking overdue tasks:', error)
    }
  }

  // Check for tasks due today/tomorrow
  async checkUpcomingTasks() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Get tasks due today and tomorrow
      const { data: upcomingTasks, error } = await this.supabase
        .from('calendar_events')
        .select('*')
        .neq('status', 'completed')
        .in('date', [today, tomorrow])

      if (error) {
        console.error('Error fetching upcoming tasks:', error)
        return
      }

      // Create notifications (only once per task per day)
      for (const task of upcomingTasks || []) {
        const taskDate = new Date(task.date)
        
        if (isToday(taskDate)) {
          await NotificationGenerator.taskDueToday(
            task.user_id,
            task.title,
            task.id.toString()
          )
        } else if (isTomorrow(taskDate)) {
          await NotificationGenerator.taskDueTomorrow(
            task.user_id,
            task.title,
            task.id.toString()
          )
        }
      }

      console.log(`📬 [NOTIFICATIONS] Checked ${upcomingTasks?.length || 0} upcoming tasks`)

    } catch (error) {
      console.error('Error checking upcoming tasks:', error)
    }
  }

  // Check for meetings today
  async checkTodaysMeetings() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      // Get meetings scheduled for today
      const { data: meetings, error } = await this.supabase
        .from('calendar_events')
        .select('*')
        .eq('type', 'meeting')
        .eq('date', today)
        .neq('status', 'completed')

      if (error) {
        console.error('Error fetching today\'s meetings:', error)
        return
      }

      // Create notifications for meetings
      for (const meeting of meetings || []) {
        const meetingTime = meeting.start_time ? 
          new Date(`${meeting.date}T${meeting.start_time}`).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          }) : 'All day'

        await NotificationGenerator.meetingToday(
          meeting.user_id,
          meeting.title,
          meetingTime,
          meeting.id.toString()
        )
      }

      console.log(`📬 [NOTIFICATIONS] Checked ${meetings?.length || 0} meetings today`)

    } catch (error) {
      console.error('Error checking today\'s meetings:', error)
    }
  }

  // Check for deals approaching close date
  async checkDealsApproachingClose() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      // Get active deals with close dates in the next 7 days
      const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: deals, error } = await this.supabase
        .from('deals')
        .select('*')
        .not('stage', 'in', '(won,lost)')
        .not('close_date', 'is', null)
        .lte('close_date', oneWeekFromNow)
        .gte('close_date', new Date().toISOString().split('T')[0])

      if (error) {
        console.error('Error fetching deals approaching close:', error)
        return
      }

      // Create notifications
      for (const deal of deals || []) {
        if (deal.close_date) {
          const daysUntilClose = differenceInDays(new Date(deal.close_date), new Date())
          
          // Notify at 7 days, 3 days, and 1 day before close
          if ([7, 3, 1].includes(daysUntilClose)) {
            await NotificationGenerator.dealCloseApproaching(
              deal.user_id,
              deal.title,
              deal.id,
              daysUntilClose
            )
          }
        }
      }

      console.log(`📬 [NOTIFICATIONS] Checked ${deals?.length || 0} deals approaching close`)

    } catch (error) {
      console.error('Error checking deals approaching close:', error)
    }
  }

  // Check for high-value deals requiring attention
  async checkHighValueDeals() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      // Get high-value deals (> 100,000) that haven't been updated in 7 days
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: deals, error } = await this.supabase
        .from('deals')
        .select('*')
        .not('stage', 'in', '(won,lost)')
        .gte('value', 100000)
        .lt('updated_at', oneWeekAgo)

      if (error) {
        console.error('Error fetching high-value deals:', error)
        return
      }

      // Create notifications
      for (const deal of deals || []) {
        await NotificationGenerator.dealHighValue(
          deal.user_id,
          deal.title,
          deal.id,
          deal.value
        )
      }

      console.log(`📬 [NOTIFICATIONS] Checked ${deals?.length || 0} high-value deals`)

    } catch (error) {
      console.error('Error checking high-value deals:', error)
    }
  }

  // Clean up stale task notifications (completed tasks, tasks no longer due today, etc.)
  async cleanupStaleTaskNotifications() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      console.log('🧹 [NOTIFICATIONS] Cleaning up stale task notifications...')

      // Get all task-related notifications
      const { data: taskNotifications, error: fetchError } = await this.supabase
        .from('notifications')
        .select('id, type, entity_id, created_at')
        .eq('user_id', user.id)
        .in('type', ['task_due_today', 'task_overdue', 'task_due_tomorrow', 'meeting_today'])

      if (fetchError) {
        console.error('⚠️ [NOTIFICATIONS] Failed to fetch task notifications for cleanup:', fetchError)
        return
      }

      if (!taskNotifications || taskNotifications.length === 0) {
        console.log('📬 [NOTIFICATIONS] No task notifications to clean up')
        return
      }

      // Get current tasks/calendar events to check what's still valid
      const { data: currentTasks, error: tasksError } = await this.supabase
        .from('calendar_events')
        .select('id, date, status, type')

      if (tasksError) {
        console.error('⚠️ [NOTIFICATIONS] Failed to fetch current tasks:', tasksError)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const idsToDelete: string[] = []

      for (const notification of taskNotifications) {
        let shouldDelete = false

        // Find the corresponding task
        const correspondingTask = currentTasks?.find(task => task.id.toString() === notification.entity_id)

        if (!correspondingTask) {
          // Task doesn't exist anymore - delete notification
          shouldDelete = true
        } else {
          // Check if notification is still valid based on task status and date
          switch (notification.type) {
            case 'task_due_today':
              // Delete if task is completed or not due today anymore
              if (correspondingTask.status === 'completed' || correspondingTask.date !== today) {
                shouldDelete = true
              }
              break
            
            case 'task_overdue':
              // Delete if task is completed or not overdue anymore
              if (correspondingTask.status === 'completed' || correspondingTask.date >= today) {
                shouldDelete = true
              }
              break
            
            case 'meeting_today':
              // Delete if meeting is not today or completed
              if (correspondingTask.type !== 'meeting' || correspondingTask.date !== today || correspondingTask.status === 'completed') {
                shouldDelete = true
              }
              break
            
            case 'task_due_tomorrow':
              const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              // Delete if task is completed or not due tomorrow anymore
              if (correspondingTask.status === 'completed' || correspondingTask.date !== tomorrow) {
                shouldDelete = true
              }
              break
          }
        }

        if (shouldDelete) {
          idsToDelete.push(notification.id)
        }
      }

      if (idsToDelete.length === 0) {
        console.log('📬 [NOTIFICATIONS] No stale task notifications found')
        return
      }

      // Delete stale notifications
      const { error: deleteError } = await this.supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        console.error('⚠️ [NOTIFICATIONS] Failed to delete stale notifications:', deleteError)
        return
      }

      console.log(`✅ [NOTIFICATIONS] Cleaned up ${idsToDelete.length} stale task notifications`)

    } catch (error) {
      console.error('⚠️ [NOTIFICATIONS] Error cleaning up stale task notifications:', error)
    }
  }

  // Run all notification checks
  async runAllChecks() {
    console.log('📬 [NOTIFICATIONS] Running all notification checks...')
    
    await Promise.all([
      this.cleanupStaleTaskNotifications(), // Clean up first
      this.checkOverdueTasks(),
      this.checkUpcomingTasks(),
      this.checkTodaysMeetings(),
      this.checkDealsApproachingClose(),
      this.checkHighValueDeals()
    ])

    console.log('📬 [NOTIFICATIONS] All notification checks completed')
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

// Enhanced global state management for monitoring
class NotificationMonitor {
  private static instance: NotificationMonitor;
  private isStarted = false;
  private interval: NodeJS.Timeout | null = null;
  private lastRunTime = 0;
  private readonly MIN_INTERVAL = 30 * 60 * 1000; // 30 minutes minimum between checks

  private constructor() {}

  static getInstance(): NotificationMonitor {
    if (!NotificationMonitor.instance) {
      NotificationMonitor.instance = new NotificationMonitor();
    }
    return NotificationMonitor.instance;
  }

  start(): () => void {
    // Prevent multiple monitoring instances
    if (this.isStarted) {
      console.log('📬 [NOTIFICATIONS] Monitoring already active, skipping...');
      return () => {}; // Return empty cleanup function
    }

    this.isStarted = true;
    console.log('📬 [NOTIFICATIONS] Starting notification monitoring...');

    // Run initial check after delay, but only if enough time has passed
    setTimeout(() => {
      this.runChecksIfNeeded();
    }, 5000); // 5 second delay

    // Run checks every 30 minutes (more reasonable frequency)
    this.interval = setInterval(() => {
      this.runChecksIfNeeded();
    }, this.MIN_INTERVAL);

    // Return cleanup function
    return () => this.stop();
  }

  private async runChecksIfNeeded() {
    const now = Date.now();
    
    // Ensure minimum time between runs to prevent spamming
    if (now - this.lastRunTime < this.MIN_INTERVAL) {
      console.log('📬 [NOTIFICATIONS] Skipping check - too soon since last run');
      return;
    }

    this.lastRunTime = now;
    
    try {
      await notificationService.runAllChecks();
    } catch (error) {
      console.error('📬 [NOTIFICATIONS] Error during scheduled check:', error);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isStarted = false;
    console.log('📬 [NOTIFICATIONS] Monitoring stopped');
  }

  isRunning(): boolean {
    return this.isStarted;
  }
}

// Export singleton function
export function startNotificationMonitoring() {
  return NotificationMonitor.getInstance().start();
}