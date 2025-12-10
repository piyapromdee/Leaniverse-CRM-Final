import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ActivityLogger } from '@/lib/activity-logger';

// Map UI activity types to database-allowed types
const mapActivityType = (uiType: string | undefined | null): string => {
  if (!uiType || typeof uiType !== 'string') {
    return 'activity';
  }
  
  const normalizedType = uiType.toLowerCase().replace(/\s+/g, '_');
  
  const typeMapping: { [key: string]: string } = {
    // Core types
    'task': 'task',
    'note': 'note',
    'appointment': 'appointment',
    'meeting': 'meeting',
    'call': 'call',
    
    // CRM activity types
    'site_visit': 'site_visit',
    'site visit': 'site_visit',
    'traveling': 'traveling',
    'email': 'email',
    'follow_up': 'follow_up',
    'follow up': 'follow_up',
    'presentation': 'presentation',
    'negotiation': 'negotiation',
    'proposal': 'proposal',
    'demo': 'demo',
    'training': 'training',
    
    // Sales activity types
    'lead_qualification': 'lead_qualification',
    'deal_review': 'deal_review',
    'contract_review': 'contract_review',
    'closing': 'closing',
    
    // Administrative types
    'planning': 'planning',
    'research': 'research',
    'documentation': 'documentation',
    'reporting': 'reporting',
    
    // Financial activities (streamlined)
    'invoice_sent': 'invoice_sent',
    'payment_follow_up': 'payment_follow_up',
    'payment_received': 'payment_received',
    
    // Administrative (essential only)
    'document_review': 'document_review',
    
    // Common variations
    'phone_call': 'call',
    'phone': 'call',
    'networking': 'meeting',
    'consultation': 'meeting',
    'interview': 'meeting'
  };
  
  return typeMapping[normalizedType] || 'activity';
};

// GET /api/activities - Fetch user's activities
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch activities from calendar_events table
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    return NextResponse.json({ activities: data || [] });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  console.log('🚀 [CREATE ACTIVITY] Starting activity creation process...');
  
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🔥 [CREATE ACTIVITY] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [CREATE ACTIVITY] User authenticated:', user.email);

    // Parse request body
    const body = await request.json();
    console.log('📋 [CREATE ACTIVITY] Request body:', body);
    
    const { 
      title, 
      description, 
      type,
      status,
      date,
      time,
      company_id,
      contact_id,
      deal_id,
      assigned_to
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Map the activity type to database-allowed type
    const mappedType = mapActivityType(type);
    console.log(`✅ [CREATE ACTIVITY] Type mapping: ${type} → ${mappedType}`);

    // Get user profile for org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    // Prepare activity data for calendar_events table
    const activityData: any = {
      user_id: user.id,
      org_id: profile?.org_id || null,
      title: title.trim(),
      description: description || null,
      type: mappedType,
      status: status || 'pending',
      priority: 'Medium', // Add default priority to satisfy database constraint (must be capitalized)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add date/time if provided
    if (date) {
      activityData.date = date;
      if (time) {
        activityData.start_time = `${date}T${time}:00`;
        activityData.end_time = `${date}T${time}:00`;
      }
    }

    // Add relationship IDs if provided
    if (company_id) activityData.company_id = company_id;
    if (contact_id) activityData.contact_id = contact_id;
    if (deal_id) activityData.deal_id = deal_id;
    if (assigned_to) activityData.assigned_to = assigned_to;

    console.log('🚀 [CREATE ACTIVITY] Final activity data:', activityData);

    // Insert into calendar_events table
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([activityData])
      .select()
      .single();

    if (error) {
      console.error('🔥 [CREATE ACTIVITY] Database insert error:', error);
      
      // Handle specific constraint errors
      if (error.message?.includes('calendar_events_type_check')) {
        return NextResponse.json({ 
          error: `Invalid activity type: "${mappedType}". Please run the database fix first.`,
          details: 'Database constraint needs updating. Check PERMANENT_ACTIVITY_FIX.sql',
          originalType: type,
          mappedType: mappedType
        }, { status: 400 });
      }
      
      if (error.message?.includes('calendar_events_priority_check')) {
        return NextResponse.json({ 
          error: `Invalid priority value in database constraint.`,
          details: 'Database constraint error on priority field. Check database schema.',
          code: error.code,
          fullError: error.message
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create activity', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log('✅ [CREATE ACTIVITY] Activity created successfully:', data);
    
    // Log activity for task/activity creation
    try {
      await ActivityLogger.taskCreated(
        data.id.toString(), 
        data.title,
        { user_id: user.id }
      );
    } catch (activityError) {
      console.warn('Failed to log task creation activity:', activityError);
    }
    
    return NextResponse.json({ 
      activity: data,
      success: true,
      message: 'Activity created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [CREATE ACTIVITY] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT /api/activities - Update an activity
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Map activity type if provided
    if (updateData.type) {
      updateData.type = mapActivityType(updateData.type);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity:', error);
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
    }

    // Log activity for task/activity update
    try {
      await ActivityLogger.taskUpdated(
        data.id.toString(), 
        data.title,
        { user_id: user.id }
      );
    } catch (activityError) {
      console.warn('Failed to log task update activity:', activityError);
    }

    return NextResponse.json({ activity: data });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/activities - Delete an activity
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Get the activity details before deleting for logging
    const { data: activityToDelete } = await supabase
      .from('calendar_events')
      .select('id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting activity:', error);
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
    }

    // Log activity for task/activity deletion
    if (activityToDelete) {
      try {
        await ActivityLogger.taskDeleted(
          activityToDelete.id.toString(), 
          activityToDelete.title || 'Deleted Task',
          { user_id: user.id }
        );
      } catch (activityError) {
        console.warn('Failed to log task deletion activity:', activityError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}