import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserOrgId } from '@/lib/get-user-org';
import { ActivityLogger } from '@/lib/activity-logger';
import { APIErrorHandler } from '@/lib/api-error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user and organization info for multi-tenancy
    const { error: orgError, orgId, userId, role } = await getUserOrgId();
    if (orgError) {
      return NextResponse.json({ error: orgError }, { status: 401 });
    }

    console.log('🔍 [CREATE TASK] User:', userId, 'Org:', orgId, 'Role:', role);

    const body = await request.json();
    const { 
      title, 
      description, 
      date, 
      priority = 'medium', 
      status = 'pending',
      type = 'task',
      deal_id,
      company_id,
      contact_id,
      assigned_to 
    } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return APIErrorHandler.handleValidationError('TASKS_POST', 'Title is required and must be a non-empty string', { title, bodyReceived: body });
    }

    const taskData: any = {
      title: title.trim(),
      user_id: userId,
      org_id: orgId || null, // Include org_id for multi-tenancy
      status,
      priority,
      type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (description) taskData.description = description.trim();
    if (date) {
      taskData.date = date;
      taskData.start_time = `${date}T09:00:00`;
      taskData.end_time = `${date}T10:00:00`;
    }
    if (deal_id) taskData.deal_id = deal_id;
    if (company_id) taskData.company_id = company_id;
    if (contact_id) taskData.contact_id = contact_id;
    if (assigned_to) taskData.assigned_to = assigned_to;

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      return APIErrorHandler.handleDatabaseError('TASKS_POST', error, { taskData, userId, orgId });
    }

    // Log activity for task creation
    try {
      await ActivityLogger.taskCreated(
        data.id.toString(), 
        data.title,
        { user_id: userId }
      );
    } catch (activityError) {
      console.warn('Failed to log task creation activity:', activityError);
    }

    return APIErrorHandler.createSuccessResponse({ task: data }, 'Task created successfully');
  } catch (error) {
    return APIErrorHandler.handleGenericError('TASKS_POST', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user and organization info for multi-tenancy
    const { error: orgError, orgId, userId, role } = await getUserOrgId();
    if (orgError) {
      return NextResponse.json({ error: orgError }, { status: 401 });
    }

    console.log('🔍 [GET TASKS] User:', userId, 'Org:', orgId, 'Role:', role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    // First, get all tasks
    let query = supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    // TEMPORARY FIX: Force org_id filtering for this specific user since profile update didn't work
    const CORRECT_ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db';
    if (userId === '1b0bfda8-d888-4ceb-8170-5cfc156f3277') {
      query = query.eq('org_id', CORRECT_ORG_ID);
      console.log('🔍 [GET TASKS] TEMP FIX: Filtering by correct org_id:', CORRECT_ORG_ID);
    } else {
      // Filter by organization for multi-tenancy
      if (role === 'admin') {
        // Admin users can see ALL tasks regardless of org_id
        console.log('🔍 [GET TASKS] Admin role: showing all tasks');
      } else if (orgId) {
        query = query.eq('org_id', orgId);
        console.log('🔍 [GET TASKS] Filtering by org_id:', orgId);
      } else {
        // Fallback to user_id if no org_id
        query = query.eq('user_id', userId);
        console.log('🔍 [GET TASKS] No org_id, filtering by user_id:', userId);
      }

      // Additional filtering for sales role
      if (role === 'sales') {
        query = query.eq('user_id', userId);
        console.log('🔍 [GET TASKS] Sales role: filtering by user_id:', userId);
      }
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by date if provided
    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      return APIErrorHandler.handleDatabaseError('TASKS_GET', error, { userId, orgId, filters: { status, date } });
    }

    // Fetch related contact and assignee data separately (workaround for missing FK constraints)
    let tasksWithRelations = data || [];

    if (data && data.length > 0) {
      try {
        // Get unique contact_ids and assigned_to user_ids
        const contactIds = [...new Set(data.map(t => t.contact_id).filter(id => id != null))];
        const assigneeIds = [...new Set(data.map(t => t.assigned_to).filter(id => id != null))];

        console.log('📋 [GET TASKS] Fetching related data for', contactIds.length, 'contacts and', assigneeIds.length, 'assignees');

        // Fetch contacts (with org_id filter for RLS)
        let contactsMap = new Map();
        if (contactIds.length > 0) {
          let contactsQuery = supabase
            .from('contacts')
            .select('id, name')
            .in('id', contactIds);

          // TEMPORARY FIX: Use correct org_id for specific user
          const CORRECT_ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db';
          if (userId === '1b0bfda8-d888-4ceb-8170-5cfc156f3277') {
            contactsQuery = contactsQuery.eq('org_id', CORRECT_ORG_ID);
          } else if (orgId) {
            contactsQuery = contactsQuery.eq('org_id', orgId);
          } else {
            // Fallback to user_id if no org_id
            contactsQuery = contactsQuery.eq('user_id', userId);
          }

          const { data: contacts, error: contactsError } = await contactsQuery;

          if (contactsError) {
            console.error('📋 [GET TASKS] Error fetching contacts - Code:', contactsError.code, 'Message:', contactsError.message, 'Details:', contactsError.details);
          } else {
            console.log('📋 [GET TASKS] Contact query result:', contacts ? `${contacts.length} contacts` : 'null/undefined');
            if (contacts && contacts.length > 0) {
              console.log('📋 [GET TASKS] Successfully fetched', contacts.length, 'contacts');
              contacts.forEach(contact => contactsMap.set(contact.id, contact));
            } else {
              console.warn('📋 [GET TASKS] No contacts returned from query (empty array or null)');
            }
          }
        }

        // Fetch assignees
        let assigneesMap = new Map();
        if (assigneeIds.length > 0) {
          const { data: assignees, error: assigneesError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name')
            .in('id', assigneeIds);

          if (assigneesError) {
            console.error('📋 [GET TASKS] Error fetching assignees - Code:', assigneesError.code, 'Message:', assigneesError.message, 'Details:', assigneesError.details);
          } else if (assignees) {
            console.log('📋 [GET TASKS] Successfully fetched', assignees.length, 'assignees');
            assignees.forEach(assignee => assigneesMap.set(assignee.id, assignee));
          }
        }

        // Merge the data
        tasksWithRelations = data.map(task => ({
          ...task,
          contact: task.contact_id ? contactsMap.get(task.contact_id) || null : null,
          assignee: task.assigned_to ? assigneesMap.get(task.assigned_to) || null : null
        }));
      } catch (relationError) {
        console.error('📋 [GET TASKS] Error fetching related data:', relationError);
        // Continue with tasks without relations if there's an error
        tasksWithRelations = data;
      }
    }

    // Debug logging for task data
    console.log('📋 [GET TASKS] Found tasks:', tasksWithRelations?.length || 0);
    if (tasksWithRelations && tasksWithRelations.length > 0) {
      console.log('📋 [GET TASKS] All tasks:', tasksWithRelations.map(task => ({
        id: task.id,
        title: task.title,
        date: task.date,
        status: task.status,
        type: task.type,
        has_contact: !!task.contact,
        has_assignee: !!task.assignee
      })));
    }

    return APIErrorHandler.createSuccessResponse({ tasks: tasksWithRelations || [] }, `Found ${tasksWithRelations?.length || 0} tasks`);
  } catch (error) {
    return APIErrorHandler.handleGenericError('TASKS_GET', error);
  }
}