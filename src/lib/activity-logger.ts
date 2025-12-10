import { createClient } from '@/lib/supabase/client'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NotificationGenerator } from '@/lib/notification-system'

export interface ActivityLog {
  id?: string
  user_id: string
  org_id?: string
  action_type: string
  entity_type: 'deal' | 'task' | 'contact' | 'company' | 'lead'
  entity_id?: string
  entity_title?: string
  description: string
  metadata?: any
  created_at?: string
}

// Activity types
export const ACTIVITY_TYPES = {
  // Deal activities
  DEAL_CREATED: 'deal_created',
  DEAL_UPDATED: 'deal_updated', 
  DEAL_DELETED: 'deal_deleted',
  DEAL_STAGE_CHANGED: 'deal_stage_changed',
  DEAL_VALUE_CHANGED: 'deal_value_changed',
  DEAL_ASSIGNED: 'deal_assigned',
  DEAL_REASSIGNED: 'deal_reassigned',
  
  // Task activities
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_COMPLETED: 'task_completed',
  TASK_MOVED: 'task_moved',
  TASK_ASSIGNED: 'task_assigned',
  TASK_REASSIGNED: 'task_reassigned',
  
  // Contact activities
  CONTACT_CREATED: 'contact_created',
  CONTACT_UPDATED: 'contact_updated',
  CONTACT_DELETED: 'contact_deleted',
  
  // Company activities
  COMPANY_CREATED: 'company_created',
  COMPANY_UPDATED: 'company_updated',
  COMPANY_DELETED: 'company_deleted',
  
  // Lead activities
  LEAD_CREATED: 'lead_created',
  LEAD_UPDATED: 'lead_updated',
  LEAD_DELETED: 'lead_deleted',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_CONVERTED: 'lead_converted'
} as const

// Helper function to generate human-readable descriptions
export function generateActivityDescription(activity: ActivityLog): string {
  const { action_type, entity_type, entity_title, metadata } = activity
  
  switch (action_type) {
    // Deal activities
    case ACTIVITY_TYPES.DEAL_CREATED:
      return `Created new deal: ${entity_title}`
    case ACTIVITY_TYPES.DEAL_UPDATED:
      return `Updated deal: ${entity_title}`
    case ACTIVITY_TYPES.DEAL_DELETED:
      return `Deleted deal: ${entity_title}`
    case ACTIVITY_TYPES.DEAL_STAGE_CHANGED:
      return `Moved deal "${entity_title}" from ${metadata?.from_stage || 'Unknown'} to ${metadata?.to_stage || 'Unknown'}`
    case ACTIVITY_TYPES.DEAL_VALUE_CHANGED:
      return `Changed deal value for "${entity_title}" from ฿${metadata?.from_value?.toLocaleString() || 0} to ฿${metadata?.to_value?.toLocaleString() || 0}`
    case ACTIVITY_TYPES.DEAL_ASSIGNED:
      return `Assigned deal "${entity_title}" to ${metadata?.assigned_to_name || 'team member'}`
    case ACTIVITY_TYPES.DEAL_REASSIGNED:
      return `Reassigned deal "${entity_title}" from ${metadata?.from_assignee || 'Unknown'} to ${metadata?.to_assignee || 'Unknown'}`
    
    // Task activities  
    case ACTIVITY_TYPES.TASK_CREATED:
      return `Created new task: ${entity_title}`
    case ACTIVITY_TYPES.TASK_UPDATED:
      return `Updated task: ${entity_title}`
    case ACTIVITY_TYPES.TASK_DELETED:
      return `Deleted task: ${entity_title}`
    case ACTIVITY_TYPES.TASK_STATUS_CHANGED:
      return `Changed task "${entity_title}" status from ${metadata?.from_status || 'Unknown'} to ${metadata?.to_status || 'Unknown'}`
    case ACTIVITY_TYPES.TASK_COMPLETED:
      return `Completed task: ${entity_title}`
    case ACTIVITY_TYPES.TASK_MOVED:
      return `Moved task "${entity_title}" to ${metadata?.to_status || 'Unknown'}`
    case ACTIVITY_TYPES.TASK_ASSIGNED:
      return `Assigned task "${entity_title}" to ${metadata?.assigned_to_name || 'team member'}`
    case ACTIVITY_TYPES.TASK_REASSIGNED:
      return `Reassigned task "${entity_title}" from ${metadata?.from_assignee || 'Unknown'} to ${metadata?.to_assignee || 'Unknown'}`
    
    // Contact activities
    case ACTIVITY_TYPES.CONTACT_CREATED:
      return `Added new contact: ${entity_title}`
    case ACTIVITY_TYPES.CONTACT_UPDATED:
      return `Updated contact: ${entity_title}`
    case ACTIVITY_TYPES.CONTACT_DELETED:
      return `Deleted contact: ${entity_title}`
    
    // Company activities
    case ACTIVITY_TYPES.COMPANY_CREATED:
      return `Added new company: ${entity_title}`
    case ACTIVITY_TYPES.COMPANY_UPDATED:
      return `Updated company: ${entity_title}`
    case ACTIVITY_TYPES.COMPANY_DELETED:
      return `Deleted company: ${entity_title}`
    
    // Lead activities
    case ACTIVITY_TYPES.LEAD_CREATED:
      return `Created new lead: ${entity_title}`
    case ACTIVITY_TYPES.LEAD_UPDATED:
      return `Updated lead: ${entity_title}`
    case ACTIVITY_TYPES.LEAD_DELETED:
      return `Deleted lead: ${entity_title}`
    case ACTIVITY_TYPES.LEAD_STATUS_CHANGED:
      return `Changed lead "${entity_title}" status from ${metadata?.from_status || 'Unknown'} to ${metadata?.to_status || 'Unknown'}`
    case ACTIVITY_TYPES.LEAD_CONVERTED:
      return `Converted lead "${entity_title}" to deal: ${metadata?.deal_title || 'New Deal'}`
    
    default:
      return `${action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${entity_title}`
  }
}

// Main logging function
export async function logActivity(activity: Omit<ActivityLog, 'id' | 'created_at' | 'description' | 'user_id'>) {
  try {
    // For server-side usage, we need to pass user_id explicitly
    // This function will be called from API routes with the user_id
    if (!activity.metadata?.user_id) {
      console.warn('Cannot log activity: No user_id provided in metadata')
      return null
    }
    
    const userId = activity.metadata.user_id
    
    // Check if we're in a server environment
    const isServer = typeof window === 'undefined'
    
    // Use service client for server-side, regular client for client-side
    const supabase = isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      : createClient()
    
    // Get user's org_id for multi-tenancy
    let orgId = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single()
      orgId = profile?.org_id
      
      // TEMPORARY FIX: Use correct org_id for this specific user
      if (userId === '1b0bfda8-d888-4ceb-8170-5cfc156f3277') {
        orgId = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
      }
    } catch (profileError) {
      console.warn('⚠️ [ACTIVITY] Could not fetch user org_id:', profileError)
    }

    // Generate description
    const description = generateActivityDescription({
      ...activity,
      user_id: userId
    } as ActivityLog)
    
    // Prepare activity log entry
    const activityLog: Omit<ActivityLog, 'id'> = {
      user_id: userId,
      org_id: orgId,
      action_type: activity.action_type,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      entity_title: activity.entity_title,
      description: description,
      metadata: activity.metadata,
      created_at: new Date().toISOString()
    }
    
    console.log('📝 [ACTIVITY] Logging activity:', activityLog)
    
    // Check for duplicate activities (same description, user, within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingActivity } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('description', description)
      .eq('entity_type', activity.entity_type)
      .eq('entity_id', activity.entity_id)
      .gte('created_at', fiveMinutesAgo)
      .limit(1)
      .single();
    
    if (existingActivity) {
      console.log('⚠️ [ACTIVITY] Duplicate activity detected, skipping:', description);
      return null;
    }
    
    // First, try to check if table exists by doing a simple select
    const { error: tableCheckError } = await supabase
      .from('activity_logs')
      .select('id')
      .limit(1)
    
    if (tableCheckError && tableCheckError.message?.includes('does not exist')) {
      console.warn('⚠️ [ACTIVITY] activity_logs table does not exist. Please run create_activity_logs_table.sql')
      console.warn('⚠️ [ACTIVITY] Falling back to console logging only')
      console.log('📝 [ACTIVITY] Would have logged:', activityLog)
      return null
    }
    
    // Try to insert into activity_logs table
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([activityLog])
      .select()
      .single()
    
    if (error) {
      console.error('⚠️ [ACTIVITY] Database error details:')
      console.error('- Error object:', error)
      console.error('- Error message:', error.message)
      console.error('- Error code:', error.code)
      console.error('- Error details:', error.details)
      console.error('- Activity being logged:', activityLog)
      
      // Check if the error is due to missing table
      if (error.message?.includes('relation "public.activity_logs" does not exist') || 
          error.message?.includes('table "activity_logs" does not exist')) {
        console.warn('⚠️ [ACTIVITY] activity_logs table does not exist. Please run create_activity_logs_table.sql')
        console.warn('⚠️ [ACTIVITY] Falling back to console logging only')
        console.log('📝 [ACTIVITY] Would have logged:', activityLog)
        return null
      }
      
      console.error('⚠️ [ACTIVITY] Failed to log activity (non-critical):', error)
      // Don't throw - logging failures shouldn't break main functionality
      return null
    }
    
    console.log('✅ [ACTIVITY] Activity logged successfully:', data)
    
    // Generate notifications for specific activity types
    try {
      await generateNotificationForActivity(activity, userId)
    } catch (notificationError) {
      console.warn('⚠️ [ACTIVITY] Notification generation failed (non-critical):', notificationError)
    }
    
    return data
    
  } catch (error) {
    console.error('⚠️ [ACTIVITY] Activity logging error (non-critical):', error)
    return null
  }
}

// Generate notifications based on activity type
async function generateNotificationForActivity(
  activity: Omit<ActivityLog, 'id' | 'created_at' | 'description' | 'user_id'>, 
  userId: string
) {
  const supabase = createClient()
  
  // Only generate notifications for specific high-impact activities
  switch (activity.action_type) {
    case ACTIVITY_TYPES.DEAL_STAGE_CHANGED:
      // Notify when deal is lost
      if (activity.metadata?.to_stage === 'lost') {
        const { data: deal } = await supabase
          .from('deals')
          .select('value')
          .eq('id', activity.entity_id)
          .single()
        
        if (deal) {
          await NotificationGenerator.dealLost(
            userId,
            activity.entity_title || 'Unknown Deal',
            activity.entity_id || 'unknown',
            deal.value || 0
          )
        }
      }
      break
      
    case ACTIVITY_TYPES.TASK_CREATED:
      // If task has assigned_to different from creator, notify the assignee
      const { data: task } = await supabase
        .from('calendar_events')
        .select('assigned_to, user_id')
        .eq('id', activity.entity_id)
        .single()
      
      if (task && task.assigned_to && task.assigned_to !== userId) {
        // Get creator info for notification
        const { data: creator } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single()
        
        const creatorName = creator 
          ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Someone'
          : 'Someone'
        
        await NotificationGenerator.taskAssigned(
          task.assigned_to,
          activity.entity_title || 'Unknown Task',
          activity.entity_id || 'unknown',
          creatorName
        )
      }
      break
  }
}

// Convenience functions for common activities
export const ActivityLogger = {
  // Generic log function for direct access
  log: logActivity,
  
  // Deal activities
  dealCreated: (dealId: string, dealTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_CREATED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata
    }),
  
  dealUpdated: (dealId: string, dealTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_UPDATED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata
    }),
  
  dealDeleted: (dealId: string, dealTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_DELETED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata
    }),
  
  dealStageChanged: (dealId: string, dealTitle: string, fromStage: string, toStage: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_STAGE_CHANGED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata: { from_stage: fromStage, to_stage: toStage, ...metadata }
    }),
  
  dealValueChanged: (dealId: string, dealTitle: string, fromValue: number, toValue: number, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_VALUE_CHANGED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata: { from_value: fromValue, to_value: toValue, ...metadata }
    }),

  dealAssigned: (dealId: string, dealTitle: string, assignedToName: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_ASSIGNED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata: { assigned_to_name: assignedToName, ...metadata }
    }),

  dealReassigned: (dealId: string, dealTitle: string, fromAssignee: string, toAssignee: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.DEAL_REASSIGNED,
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: dealTitle,
      metadata: { from_assignee: fromAssignee, to_assignee: toAssignee, ...metadata }
    }),
  
  // Task activities
  taskCreated: (taskId: string, taskTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_CREATED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata
    }),
  
  taskUpdated: (taskId: string, taskTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_UPDATED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata
    }),
  
  taskDeleted: (taskId: string, taskTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_DELETED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata
    }),
  
  taskStatusChanged: (taskId: string, taskTitle: string, fromStatus: string, toStatus: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_STATUS_CHANGED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata: { from_status: fromStatus, to_status: toStatus, ...metadata }
    }),
  
  taskCompleted: (taskId: string, taskTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_COMPLETED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata
    }),
  
  taskMoved: (taskId: string, taskTitle: string, toStatus: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_MOVED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata: { to_status: toStatus, ...metadata }
    }),

  taskAssigned: (taskId: string, taskTitle: string, assignedToName: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_ASSIGNED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata: { assigned_to_name: assignedToName, ...metadata }
    }),

  taskReassigned: (taskId: string, taskTitle: string, fromAssignee: string, toAssignee: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.TASK_REASSIGNED,
      entity_type: 'task',
      entity_id: taskId,
      entity_title: taskTitle,
      metadata: { from_assignee: fromAssignee, to_assignee: toAssignee, ...metadata }
    }),
  
  // Lead activities
  leadCreated: (leadId: string, leadTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.LEAD_CREATED,
      entity_type: 'lead',
      entity_id: leadId,
      entity_title: leadTitle,
      metadata
    }),
  
  leadUpdated: (leadId: string, leadTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.LEAD_UPDATED,
      entity_type: 'lead',
      entity_id: leadId,
      entity_title: leadTitle,
      metadata
    }),
  
  leadDeleted: (leadId: string, leadTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.LEAD_DELETED,
      entity_type: 'lead',
      entity_id: leadId,
      entity_title: leadTitle,
      metadata
    }),
  
  leadStatusChanged: (leadId: string, leadTitle: string, fromStatus: string, toStatus: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.LEAD_STATUS_CHANGED,
      entity_type: 'lead',
      entity_id: leadId,
      entity_title: leadTitle,
      metadata: { from_status: fromStatus, to_status: toStatus, ...metadata }
    }),
  
  leadConverted: (leadId: string, leadTitle: string, metadata?: any) =>
    logActivity({
      action_type: ACTIVITY_TYPES.LEAD_CONVERTED,
      entity_type: 'lead',
      entity_id: leadId,
      entity_title: leadTitle,
      metadata
    })
}