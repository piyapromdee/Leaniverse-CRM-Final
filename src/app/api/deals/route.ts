import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ActivityLogger } from '@/lib/activity-logger';
import { getUserOrgId } from '@/lib/get-user-org';

// GET /api/deals - Fetch user's deals
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user and organization info for multi-tenancy
    const { error: orgError, orgId, userId, role } = await getUserOrgId();
    if (orgError) {
      return NextResponse.json({ error: orgError }, { status: 401 });
    }

    console.log('🔍 [GET DEALS] User:', userId, 'Org:', orgId, 'Role:', role);

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');

    let query = supabase
      .from('deals')
      .select(`
        *,
        companies:company_id(id, name),
        contacts:contact_id(id, name)
      `)
      .order('created_at', { ascending: false });

    // Filter by organization for multi-tenancy
    if (role === 'admin' || role === 'owner') {
      // Admin/Owner users can see ALL deals in the organization
      console.log('🔓 [DEALS] Admin/Owner role: showing all deals');
    } else if (orgId) {
      query = query.eq('org_id', orgId);
      console.log('🔍 [DEALS] Filtering by org_id:', orgId);
    } else {
      // Fallback to user_id if no org_id
      query = query.eq('user_id', userId);
      console.log('🔍 [DEALS] No org_id, filtering by user_id:', userId);
    }

    // SECURITY: Data isolation - Sales users only see deals assigned to them
    if (role === 'sales') {
      query = query.eq('assigned_to', userId);
      console.log('🔒 [DEALS] Sales role: filtering by assigned_to =', userId);
    }

    // Filter by stage if provided
    if (stage) {
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching deals:', error);
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }

    // Map close_date to expected_close_date for frontend compatibility
    const dealsWithMappedDates = (data || []).map(deal => ({
      ...deal,
      expected_close_date: deal.close_date
    }));

    return NextResponse.json({ deals: dealsWithMappedDates });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/deals - Create a new deal with comprehensive debugging
export async function POST(request: NextRequest) {
  console.log('🚀 [CREATE DEAL] Starting deal creation process...');
  console.log('🚀 [CREATE DEAL] Request timestamp:', new Date().toISOString());
  
  try {
    const supabase = await createClient();
    console.log('✅ [CREATE DEAL] Supabase client created successfully');
    
    // Get current user with detailed authentication check
    console.log('🔍 [CREATE DEAL] Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('🔥 [CREATE DEAL] Authentication error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.error('🔥 [CREATE DEAL] No user found - user is null/undefined');
      return NextResponse.json({ 
        error: 'User not authenticated',
        details: 'No valid session found'
      }, { status: 401 });
    }
    
    console.log('✅ [CREATE DEAL] User authenticated:', {
      id: user.id,
      email: user.email
    });

    // Get organization ID for multi-tenancy
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();
    
    const orgId = profile?.org_id;
    console.log('🔍 [CREATE DEAL] User org_id:', orgId);

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('✅ [CREATE DEAL] Request body parsed:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('🔥 [CREATE DEAL] Failed to parse JSON body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 400 });
    }
    
    const { 
      title, 
      description, 
      value, 
      stage, 
      priority, 
      expected_close_date, 
      close_date, 
      company_id, 
      contact_id, 
      assigned_to,
      channel 
    } = body;

    console.log('🔍 [CREATE DEAL] Extracted fields:', {
      title, description, value, stage, priority, 
      expected_close_date, close_date, company_id, contact_id, assigned_to, channel
    });

    // Enhanced field validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      console.error('🔥 [CREATE DEAL] Validation failed: Title is required');
      return NextResponse.json({ 
        error: 'Title is required and must be a non-empty string',
        received: { title, type: typeof title }
      }, { status: 400 });
    }

    // Let database CHECK constraint handle stage validation
    const dealStage = stage || 'lead';
    console.log('🔍 [CREATE DEAL] Stage value to be inserted:', dealStage);

    // Prepare complete deal data with all fields properly handled
    const dealData = {
      user_id: user.id,
      org_id: orgId || null, // Include org_id for multi-tenancy
      title: title.trim(),
      description: description || null,
      value: value ? parseInt(value) || 0 : 0,
      stage: dealStage,
      priority: priority || 'medium',
      close_date: expected_close_date || close_date || null,
      expected_close_date: expected_close_date || close_date || null, // Support both columns
      company_id: company_id || null,
      contact_id: contact_id || null,
      assigned_to: assigned_to || null,
      channel: channel || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('🚀 [CREATE DEAL] Final deal data prepared for database:', JSON.stringify(dealData, null, 2));

    // Test database connection first
    try {
      console.log('🔍 [CREATE DEAL] Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('deals')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('🔥 [CREATE DEAL] Database connection test failed:', testError);
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: testError.message,
          code: testError.code
        }, { status: 500 });
      }
      console.log('✅ [CREATE DEAL] Database connection test successful');
    } catch (connError) {
      console.error('🔥 [CREATE DEAL] Database connection error:', connError);
      return NextResponse.json({ 
        error: 'Failed to connect to database',
        details: connError instanceof Error ? connError.message : 'Unknown connection error'
      }, { status: 500 });
    }

    // Attempt to insert the deal
    console.log('🔍 [CREATE DEAL] Attempting to insert deal into database...');
    const { data, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select(`
        *,
        companies:company_id(id, name),
        contacts:contact_id(id, name)
      `)
      .single();

    if (error) {
      console.error('🔥 [CREATE DEAL] DATABASE INSERT FAILED!');
      console.error('🔥 [CREATE DEAL] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      console.error('🔥 [CREATE DEAL] Deal data that failed insert:', JSON.stringify(dealData, null, 2));
      
      // Check if table doesn't exist
      if (error.message && error.message.includes('relation "deals" does not exist')) {
        console.error('🔥 [CREATE DEAL] CRITICAL: Deals table does not exist in database!');
        return NextResponse.json({ 
          error: 'Deals table not found - please create the database tables first',
          fallback: true,
          deal: { id: `temp-${Date.now()}`, ...dealData },
          sqlHint: 'Run the database migration to create the deals table'
        }, { status: 404 });
      }
      
      // Check for column errors
      if (error.code === '42703') {
        console.error('🔥 [CREATE DEAL] COLUMN ERROR - table structure mismatch');
        return NextResponse.json({ 
          error: `Database column error: ${error.message}`,
          details: 'The deals table structure may not match the expected schema',
          code: error.code,
          suggestion: 'Check if all required columns exist in the deals table'
        }, { status: 400 });
      }

      // Check for RLS policy errors
      if (error.code === '42501' || error.message.includes('RLS') || error.message.includes('policy')) {
        console.error('🔥 [CREATE DEAL] RLS POLICY ERROR - user cannot insert into deals table');
        return NextResponse.json({ 
          error: 'Row Level Security policy violation',
          details: 'User does not have permission to insert deals. Check RLS policies.',
          code: error.code,
          userId: user.id,
          suggestion: 'Ensure INSERT policy exists and allows this user to create deals'
        }, { status: 403 });
      }

      // Check for constraint violations
      if (error.code === '23505') {
        console.error('🔥 [CREATE DEAL] UNIQUE CONSTRAINT VIOLATION');
        return NextResponse.json({ 
          error: `Unique constraint violation: ${error.message}`,
          details: 'Duplicate data detected',
          code: error.code
        }, { status: 409 });
      }

      // Check for foreign key violations
      if (error.code === '23503') {
        console.error('🔥 [CREATE DEAL] FOREIGN KEY CONSTRAINT VIOLATION');
        return NextResponse.json({ 
          error: `Foreign key constraint violation: ${error.message}`,
          details: 'Referenced company_id or contact_id does not exist',
          code: error.code,
          dealData: dealData
        }, { status: 400 });
      }

      // Check for check constraint violations (stage values)
      if (error.code === '23514') {
        console.error('🔥 [CREATE DEAL] CHECK CONSTRAINT VIOLATION - likely invalid stage value');
        return NextResponse.json({ 
          error: `Check constraint violation: ${error.message}`,
          details: 'Invalid stage value or other constraint violation',
          code: error.code,
          attemptedStage: dealData.stage,
          validStages: ['lead', 'qualified', 'proposal', 'won', 'lost']
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create deal in database', 
        details: error.message,
        code: error.code || 'unknown',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    console.log('✅ [CREATE DEAL] Successfully inserted deal into database!');
    console.log('✅ [CREATE DEAL] Created deal data:', JSON.stringify(data, null, 2));

    // Map close_date to expected_close_date for frontend compatibility
    const dealWithMappedDate = {
      ...data,
      expected_close_date: data.close_date
    };

    // Create activity log using proper ActivityLogger
    console.log('🔍 [CREATE DEAL] Creating activity log...');
    try {
      await ActivityLogger.dealCreated(data.id, data.title, { 
        stage: data.stage, 
        value: data.value 
      });
      console.log('✅ [CREATE DEAL] Activity log created successfully');
    } catch (activityError) {
      console.log('⚠️ [CREATE DEAL] Activity log creation error (non-critical):', activityError);
      // Continue anyway - activity log is not critical
    }

    console.log('🎉 [CREATE DEAL] Deal creation completed successfully!');
    console.log('🎉 [CREATE DEAL] Returning deal data to client:', JSON.stringify(dealWithMappedDate, null, 2));
    
    return NextResponse.json({ 
      deal: dealWithMappedDate,
      success: true,
      message: 'Deal created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('🔥 [CREATE DEAL] UNEXPECTED SERVER ERROR!');
    console.error('🔥 [CREATE DEAL] Error name:', error.name);
    console.error('🔥 [CREATE DEAL] Error message:', error.message);
    console.error('🔥 [CREATE DEAL] Error stack:', error.stack);
    console.error('🔥 [CREATE DEAL] Full error object:', error);
    console.error('🔥 [CREATE DEAL] Timestamp:', new Date().toISOString());
    
    return NextResponse.json({ 
      error: 'Internal server error during deal creation',
      details: error.message,
      name: error.name,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT /api/deals - Update an existing deal
export async function PUT(request: NextRequest) {
  console.log('🔄 [UPDATE DEAL] Starting deal update process...');
  
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🔥 [UPDATE DEAL] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('🔍 [UPDATE DEAL] Request body:', body);
    
    const { id, ...updateData } = body;

    if (!id) {
      console.error('🔥 [UPDATE DEAL] No deal ID provided');
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    // Handle expected_close_date -> close_date mapping
    if (updateData.expected_close_date) {
      updateData.close_date = updateData.expected_close_date;
      delete updateData.expected_close_date;
    }

    // Clean up the data - only include fields that are actually provided
    const cleanUpdateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only add fields that are explicitly provided (not undefined)
    if (updateData.title !== undefined) cleanUpdateData.title = updateData.title;
    if (updateData.description !== undefined) cleanUpdateData.description = updateData.description || null;
    if (updateData.value !== undefined) cleanUpdateData.value = updateData.value ? parseInt(updateData.value) || 0 : 0;
    if (updateData.stage !== undefined) {
      cleanUpdateData.stage = updateData.stage;
      
      // Automatically set closed_date when deal is won or lost
      if (updateData.stage === 'won' || updateData.stage === 'lost') {
        cleanUpdateData.closed_date = new Date().toISOString();
        console.log('🎯 [UPDATE DEAL] Setting closed_date for stage:', updateData.stage);
      }
      
      // Set lost_date specifically for lost deals
      if (updateData.stage === 'lost') {
        cleanUpdateData.lost_date = new Date().toISOString();
        console.log('❌ [UPDATE DEAL] Setting lost_date for lost deal');
      }
    }
    if (updateData.priority !== undefined) cleanUpdateData.priority = updateData.priority;
    if (updateData.close_date !== undefined) cleanUpdateData.close_date = updateData.close_date || null;
    if (updateData.closed_date !== undefined) cleanUpdateData.closed_date = updateData.closed_date || null;
    if (updateData.lost_date !== undefined) cleanUpdateData.lost_date = updateData.lost_date || null;
    if (updateData.loss_reason !== undefined) cleanUpdateData.loss_reason = updateData.loss_reason || null;
    if (updateData.company_id !== undefined) cleanUpdateData.company_id = updateData.company_id || null;
    if (updateData.contact_id !== undefined) cleanUpdateData.contact_id = updateData.contact_id || null;
    if (updateData.assigned_to !== undefined) cleanUpdateData.assigned_to = updateData.assigned_to || null;
    if (updateData.channel !== undefined) cleanUpdateData.channel = updateData.channel || null;

    console.log('🔍 [UPDATE DEAL] Clean update data:', cleanUpdateData);

    // Get original deal data for activity logging BEFORE updating
    let originalDeal = null;
    if (updateData.stage !== undefined) {
      const { data: originalData } = await supabase
        .from('deals')
        .select('stage, title')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      originalDeal = originalData;
    }

    const { data, error } = await supabase
      .from('deals')
      .update(cleanUpdateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        companies:company_id(id, name),
        contacts:contact_id(id, name)
      `)
      .single();

    if (error) {
      console.error('🔥 [UPDATE DEAL] Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to update deal', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    // Map close_date to expected_close_date for frontend compatibility
    const dealWithMappedDate = {
      ...data,
      expected_close_date: data.close_date
    };

    // Log activity if stage was changed
    if (originalDeal && originalDeal.stage !== updateData.stage) {
      try {
        const stageNames = {
          discovery: 'Discovery',
          proposal: 'Proposal',
          won: 'Closed Won',
          lost: 'Closed Lost'
        };

        await ActivityLogger.dealStageChanged(
          data.id,
          data.title,
          stageNames[originalDeal.stage as keyof typeof stageNames] || originalDeal.stage,
          stageNames[updateData.stage as keyof typeof stageNames] || updateData.stage,
          { user_id: user.id }
        );
      } catch (activityError) {
        console.warn('⚠️ [UPDATE DEAL] Activity logging failed (non-critical):', activityError);
      }
    }

    console.log('✅ [UPDATE DEAL] Deal updated successfully:', dealWithMappedDate);
    return NextResponse.json({ deal: dealWithMappedDate });
  } catch (error: any) {
    console.error('🔥 [UPDATE DEAL] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE /api/deals - Delete a deal
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
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting deal:', error);
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}