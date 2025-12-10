import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ActivityLogger } from '@/lib/activity-logger';

// GET /api/deals/[id] - Fetch a specific deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId); // Handle URL encoding
  
  console.log(`🔍 [GET DEAL] Raw ID from params: ${rawId}`);
  console.log(`🔍 [GET DEAL] Decoded ID: ${id}`);
  console.log(`🔍 [GET DEAL] ID type: ${typeof id}, length: ${id.length}`);
  
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🔥 [GET DEAL] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ [GET DEAL] User authenticated: ${user.email} (ID: ${user.id})`);
    
    // First, let's check if the deal exists at all
    console.log(`🔍 [GET DEAL] Checking if deal exists: ${id}`);
    const { data: dealCheck, error: checkError } = await supabase
      .from('deals')
      .select('id, user_id, assigned_to, title')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error('🔥 [GET DEAL] Deal does not exist:', checkError);
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    
    console.log(`✅ [GET DEAL] Deal exists:`, {
      dealId: dealCheck.id,
      dealUserId: dealCheck.user_id,
      dealAssignedTo: dealCheck.assigned_to,
      dealTitle: dealCheck.title,
      currentUserId: user.id
    });

    // Check user role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role || 'sales';
    console.log(`🔍 [GET DEAL] User role: ${userRole}`);

    // Check permissions: Admin/Owner can access all deals, others only their own or assigned
    const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';
    const ownsOrAssignedToDeal = dealCheck.user_id === user.id || dealCheck.assigned_to === user.id;
    const hasAccess = isAdminOrOwner || ownsOrAssignedToDeal;

    console.log(`🔍 [GET DEAL] Access check:`, {
      isAdminOrOwner,
      ownsOrAssignedToDeal,
      hasAccess
    });

    if (!hasAccess) {
      console.error('🔥 [GET DEAL] User does not have access to this deal');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the basic deal data first
    const { data: dealData, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();

    if (dealError) {
      console.error('🔥 [GET DEAL] Database error fetching deal data:', dealError);
      return NextResponse.json({ error: 'Failed to fetch deal data' }, { status: 500 });
    }

    console.log('✅ [GET DEAL] Basic deal data fetched successfully');

    // Now get related data separately to avoid JOIN issues
    let companyData = null;
    let contactData = null;
    let assignedUserData = null;

    // Fetch company if company_id exists
    if (dealData.company_id) {
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', dealData.company_id)
          .single();
        companyData = company;
        console.log('✅ [GET DEAL] Company data fetched');
      } catch (e) {
        console.log('⚠️ [GET DEAL] Company fetch failed (non-critical):', e);
      }
    }

    // Fetch contact if contact_id exists
    if (dealData.contact_id) {
      try {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, name, email, phone')
          .eq('id', dealData.contact_id)
          .single();
        contactData = contact;
        console.log('✅ [GET DEAL] Contact data fetched');
      } catch (e) {
        console.log('⚠️ [GET DEAL] Contact fetch failed (non-critical):', e);
      }
    }

    // Fetch assigned user if assigned_to exists
    if (dealData.assigned_to) {
      try {
        const { data: assignedUser } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', dealData.assigned_to)
          .single();
        assignedUserData = assignedUser;
        console.log('✅ [GET DEAL] Assigned user data fetched');
      } catch (e) {
        console.log('⚠️ [GET DEAL] Assigned user fetch failed (non-critical):', e);
      }
    }

    // Combine all data
    const data = {
      ...dealData,
      companies: companyData,
      contacts: contactData,
      assigned_user: assignedUserData
    };

    console.log('✅ [GET DEAL] All deal data assembled successfully');

    // Map close_date to expected_close_date for frontend compatibility
    const dealWithMappedDate = {
      ...data,
      expected_close_date: data.close_date
    };

    console.log(`✅ [GET DEAL] Deal found: ${data.title}`);
    return NextResponse.json({ data: dealWithMappedDate });
    
  } catch (error: any) {
    console.error('🔥 [GET DEAL] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// PATCH /api/deals/[id] - Update a deal (DEFINITIVE IMPLEMENTATION)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`🚀 [PATCH DEAL] === DEFINITIVE API ROUTE CALLED ===`);
  console.log(`🚀 [PATCH DEAL] Deal ID: ${id}`);
  console.log(`🚀 [PATCH DEAL] Timestamp: ${new Date().toISOString()}`);
  console.log(`🚀 [PATCH DEAL] Request URL: ${request.url}`);
  console.log(`🚀 [PATCH DEAL] Request method: ${request.method}`);
  
  try {
    // Step 1: Create Supabase client
    console.log(`🔍 [PATCH DEAL] Step 1: Creating Supabase client...`);
    const supabase = await createClient();
    console.log(`✅ [PATCH DEAL] Supabase client created successfully`);
    
    // Step 2: Authentication
    console.log(`🔍 [PATCH DEAL] Step 2: Checking authentication...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('🔥 [PATCH DEAL] Authentication error:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.error('🔥 [PATCH DEAL] No user found');
      return NextResponse.json({ 
        error: 'User not authenticated' 
      }, { status: 401 });
    }
    
    console.log(`✅ [PATCH DEAL] User authenticated: ${user.email} (ID: ${user.id})`);

    // Step 3: Parse request body
    console.log(`🔍 [PATCH DEAL] Step 3: Parsing request body...`);
    let body;
    try {
      body = await request.json();
      console.log('✅ [PATCH DEAL] Request body parsed successfully');
      console.log('📋 [PATCH DEAL] Body contents:', JSON.stringify(body, null, 2));
    } catch (parseError: any) {
      console.error('🔥 [PATCH DEAL] JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      }, { status: 400 });
    }
    
    // Step 4: Extract fields from request body
    console.log(`🔍 [PATCH DEAL] Step 4: Extracting update fields...`);
    const { 
      title, 
      description, 
      value, 
      stage, 
      priority, 
      close_date,
      expected_close_date,
      closed_date,
      company_id, 
      contact_id, 
      assigned_to 
    } = body;

    console.log('📋 [PATCH DEAL] Extracted fields:', {
      title, description, value, stage, priority, 
      close_date, expected_close_date, closed_date, company_id, contact_id, assigned_to
    });

    // Step 5: Verify deal exists and user has permission
    console.log(`🔍 [PATCH DEAL] Step 5: Verifying deal ownership...`);
    const { data: existingDeal, error: fetchError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .single();

    if (fetchError) {
      console.error('🔥 [PATCH DEAL] Error fetching deal:', fetchError);
      return NextResponse.json({ 
        error: 'Deal not found or access denied', 
        details: fetchError.message,
        dealId: id
      }, { status: 404 });
    }
    
    if (!existingDeal) {
      console.error(`🔥 [PATCH DEAL] Deal not found: ${id}`);
      return NextResponse.json({ 
        error: 'Deal not found or access denied',
        dealId: id,
        userId: user.id
      }, { status: 404 });
    }

    console.log(`✅ [PATCH DEAL] Deal verified: "${existingDeal.title}"`);

    // Step 6: Prepare update data (ONLY fields explicitly provided)
    console.log(`🔍 [PATCH DEAL] Step 6: Preparing update data...`);
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are explicitly provided (not undefined)
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (value !== undefined) updateData.value = parseInt(value) || 0;
    if (stage !== undefined) updateData.stage = stage;
    if (priority !== undefined) updateData.priority = priority;
    if (close_date !== undefined) updateData.close_date = close_date;
    if (expected_close_date !== undefined) {
      updateData.close_date = expected_close_date; // Map to close_date for backward compatibility
      updateData.expected_close_date = expected_close_date; // Also set expected_close_date if column exists
    }
    if (closed_date !== undefined) updateData.closed_date = closed_date;
    if (company_id !== undefined) updateData.company_id = company_id;
    if (contact_id !== undefined) updateData.contact_id = contact_id;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    console.log('📋 [PATCH DEAL] Fields to update:', Object.keys(updateData));
    console.log('🚀 [PATCH DEAL] Final update data:', JSON.stringify(updateData, null, 2));

    // Step 7: Execute database update
    console.log(`🔍 [PATCH DEAL] Step 7: Executing database update...`);
    const { data, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('🔥 [PATCH DEAL] Database update error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Handle specific database errors
      if (error.message?.includes('relation "deals" does not exist')) {
        return NextResponse.json({ 
          error: 'Deals table not found',
          suggestion: 'Run database migrations to create the deals table'
        }, { status: 500 });
      }
      
      if (error.code === '42703') {
        return NextResponse.json({ 
          error: `Database column error: ${error.message}`,
          details: 'Table structure mismatch'
        }, { status: 400 });
      }

      if (error.code === '42501') {
        return NextResponse.json({ 
          error: 'Permission denied',
          details: 'Row Level Security policy violation'
        }, { status: 403 });
      }

      if (error.code === '23503') {
        return NextResponse.json({ 
          error: `Foreign key constraint: ${error.message}`,
          details: 'Referenced ID does not exist'
        }, { status: 400 });
      }

      if (error.code === '23514') {
        return NextResponse.json({ 
          error: `Invalid stage value: "${updateData.stage}"`,
          details: 'Stage must be: lead, qualified, proposal, won, lost'
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Database update failed', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log('✅ [PATCH DEAL] Database update successful!');
    console.log('✅ [PATCH DEAL] Updated deal:', JSON.stringify(data, null, 2));

    // Step 8: Create activity logs for changes
    console.log(`🔍 [PATCH DEAL] Step 8: Creating activity logs...`);
    try {
      // Log stage change
      if (stage && stage !== existingDeal.stage) {
        await ActivityLogger.dealStageChanged(id, data.title, existingDeal.stage, stage);
        console.log('✅ [PATCH DEAL] Stage change logged');
      }
      
      // Log value change
      if (value !== undefined && parseInt(value) !== existingDeal.value) {
        await ActivityLogger.dealValueChanged(id, data.title, existingDeal.value, parseInt(value) || 0);
        console.log('✅ [PATCH DEAL] Value change logged');
      }
      
      // Log general update (if no specific changes logged)
      if (!stage || stage === existingDeal.stage) {
        await ActivityLogger.dealUpdated(id, data.title);
        console.log('✅ [PATCH DEAL] General update logged');
      }
    } catch (activityError) {
      console.log('⚠️ [PATCH DEAL] Activity log error (non-critical):', activityError);
    }

    console.log('🎉 [PATCH DEAL] === DEAL UPDATE COMPLETED SUCCESSFULLY ===');
    
    // Step 9: Map close_date to expected_close_date and return success response
    const dealWithMappedDate = {
      ...data,
      expected_close_date: data.close_date
    };

    return NextResponse.json({ 
      data: dealWithMappedDate,
      success: true,
      message: 'Deal updated successfully',
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [PATCH DEAL] === UNEXPECTED SERVER ERROR ===');
    console.error('🔥 [PATCH DEAL] Error name:', error.name);
    console.error('🔥 [PATCH DEAL] Error message:', error.message);
    console.error('🔥 [PATCH DEAL] Error stack:', error.stack);
    console.error('🔥 [PATCH DEAL] Full error:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      name: error.name,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT /api/deals/[id] - Alternative update method (for compatibility)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 [PUT DEAL] PUT request received, redirecting to PATCH logic');
  return PATCH(request, { params });
}

// DELETE /api/deals/[id] - Delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`🗑️ [DELETE DEAL] Deleting deal: ${id}`);
  
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🔥 [DELETE DEAL] Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get deal info before deletion for activity log
    const { data: dealToDelete } = await supabase
      .from('deals')
      .select('title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('🔥 [DELETE DEAL] Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete deal',
        details: error.message 
      }, { status: 500 });
    }

    // Log the deletion
    if (dealToDelete) {
      try {
        await ActivityLogger.dealDeleted(id, dealToDelete.title);
        console.log('✅ [DELETE DEAL] Activity logged');
      } catch (activityError) {
        console.log('⚠️ [DELETE DEAL] Activity log error (non-critical):', activityError);
      }
    }

    console.log(`✅ [DELETE DEAL] Deal deleted: ${id}`);
    return NextResponse.json({ 
      message: 'Deal deleted successfully',
      dealId: id 
    });
    
  } catch (error: any) {
    console.error('🔥 [DELETE DEAL] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}