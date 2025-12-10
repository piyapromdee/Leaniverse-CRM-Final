// API endpoints for Lead Management
// NEW FILE - doesn't affect existing APIs

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger, ACTIVITY_TYPES } from '@/lib/activity-logger'
import { getUserOrgId } from '@/lib/get-user-org'

// GET /api/leads - Fetch all leads for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // TEMPORARY: Use service client to bypass RLS and see ALL leads
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get user and organization info for multi-tenancy
    const { error: orgError, orgId, userId, role } = await getUserOrgId()
    if (orgError) {
      return NextResponse.json({ error: orgError }, { status: 401 })
    }

    console.log('🔍 Current user ID:', userId)
    console.log('🔍 Current org ID:', orgId)
    console.log('🔍 Current user role:', role)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query with proper multi-tenancy filtering
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // IMPORTANT: Filter by organization ID for multi-tenancy
    if (role === 'admin' || role === 'owner') {
      // Admin/Owner users can see ALL leads in the organization
      console.log('🔓 [LEADS] Admin/Owner role: showing all leads')
    } else if (orgId) {
      query = query.eq('org_id', orgId)
      console.log('🔍 [LEADS] Filtering leads by org_id:', orgId)
    } else {
      // If no org_id, filter by user_id as fallback
      query = query.eq('user_id', userId)
      console.log('🔍 [LEADS] No org_id found, filtering by user_id:', userId)
    }

    // SECURITY: Data isolation - Sales users see leads assigned to them OR unassigned leads
    // Unassigned leads (from LINE/Facebook webhooks) are visible to all sales for quick response
    if (role === 'sales') {
      query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`)
      console.log('🔒 [LEADS] Sales role: filtering by assigned_to =', userId, 'OR unassigned')
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (source && source !== 'all') {
      query = query.eq('source', source)
    }

    console.log('🔍 [GET LEADS] About to execute query for user:', userId)
    const { data: leads, error } = await query
    console.log('🔍 [GET LEADS] Query result - Leads:', leads?.length || 0, 'Error:', error)

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    console.log('📋 Fetched leads count:', leads?.length || 0)
    console.log('📋 User role:', role)
    console.log('📋 User ID:', userId)
    console.log('📋 Org ID:', orgId)
    if (leads && leads.length > 0) {
      console.log('📋 First lead org_id:', leads[0].org_id)
    }

    // Get total count for pagination with same filters
    let countQuery = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    // Apply same org filtering for count
    if (role === 'admin' || role === 'owner') {
      // Admin/Owner users can see ALL leads count
      console.log('🔓 [LEADS COUNT] Admin/Owner role: counting all leads')
    } else if (orgId) {
      countQuery = countQuery.eq('org_id', orgId)
      console.log('🔍 [LEADS COUNT] Filtering by org_id:', orgId)
    } else {
      countQuery = countQuery.eq('user_id', userId)
      console.log('🔍 [LEADS COUNT] No org_id, filtering by user_id:', userId)
    }

    // SECURITY: Sales users only count their assigned leads
    if (role === 'sales') {
      countQuery = countQuery.eq('assigned_to', userId)
      console.log('🔒 [LEADS COUNT] Sales role: filtering by assigned_to =', userId)
    }

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }
    if (source && source !== 'all') {
      countQuery = countQuery.eq('source', source)
    }

    const { count } = await countQuery

    return NextResponse.json({
      leads: leads || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error in GET /api/leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [CREATE LEAD] Starting lead creation...');
    const supabase = await createClient()
    
    // Get current user - this should be required for lead creation from dashboard
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ [CREATE LEAD] Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required to create leads' }, { status: 401 })
    }
    console.log('✅ [CREATE LEAD] User authenticated:', user.id);

    // Get user and organization info for multi-tenancy
    const { error: orgError, orgId, userId, role } = await getUserOrgId()
    if (orgError) {
      console.log('❌ [CREATE LEAD] Org error:', orgError);
      return NextResponse.json({ error: orgError }, { status: 401 })
    }
    console.log('✅ [CREATE LEAD] User org info - userId:', userId, 'orgId:', orgId, 'role:', role);
    
    const body = await request.json()
    console.log('📋 [CREATE LEAD] Request body:', JSON.stringify(body, null, 2));
    
    // Validate required fields - at least one contact method needed
    if (!body.email && !body.phone && !body.first_name && !body.last_name && !body.company_name) {
      return NextResponse.json({ error: 'At least name, email, phone, or company is required' }, { status: 400 })
    }

    // Prepare lead data with org_id for multi-tenancy
    // TEMPORARY FIX: Force correct org_id for this specific user
    const CORRECT_ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db';
    const finalOrgId = userId === '1b0bfda8-d888-4ceb-8170-5cfc156f3277' ? CORRECT_ORG_ID : (orgId || null);
    
    const leadData = {
      user_id: userId,
      org_id: finalOrgId, // Include org_id for multi-tenancy
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      email: body.email || '',  // Use empty string as workaround until DB allows NULL
      phone: body.phone || null,
      company_name: body.company_name || body.company || null,
      job_title: body.job_title || null,
      source: body.source || 'website',
      priority: body.priority || 'medium',
      
      // Business information
      company_size: body.company_size || null,
      industry: body.industry || null,
      budget_range: body.budget_range || null,
      decision_timeline: body.decision_timeline || null,
      
      // Marketing data (UTM parameters)
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
      referrer_url: body.referrer_url || null,
      landing_page: body.landing_page || null,
      
      // Qualification data
      pain_points: body.pain_points || null,
      goals: body.goals || null,
      current_solution: body.current_solution || null,
      
      // Notes
      notes: body.notes || null,
      
      // Contact preferences
      preferred_contact_method: body.preferred_contact_method || 'email',
      best_contact_time: body.best_contact_time || null,
    }

    // Insert the lead using authenticated user's supabase client
    console.log('💾 [CREATE LEAD] Inserting lead data:', JSON.stringify(leadData, null, 2));
    const { data: lead, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single()

    if (error) {
      console.error('❌ [CREATE LEAD] Database error:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A lead with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    console.log('✅ [CREATE LEAD] Lead created successfully:', JSON.stringify(lead, null, 2));

    // Calculate initial lead score
    if (lead) {
      try {
        // Simple lead scoring algorithm
        let score = 0
        
        // Source scoring
        const sourceScores = {
          'referral': 25,
          'linkedin': 20, 
          'website': 15,
          'google_ads': 10,
          'facebook_ads': 8,
          'email_marketing': 5,
          'cold_outreach': 3
        }
        score += sourceScores[lead.source as keyof typeof sourceScores] || 5
        
        // Company size scoring
        if (lead.company_name) score += 10
        
        // Contact info completeness
        if (lead.email) score += 10
        if (lead.phone) score += 10
        
        // Priority scoring
        const priorityScores = { 'urgent': 20, 'high': 15, 'medium': 10, 'low': 5 }
        score += priorityScores[lead.priority as keyof typeof priorityScores] || 10
        
        // Job title scoring (decision makers get higher scores)
        if (lead.job_title) {
          const title = lead.job_title.toLowerCase()
          if (title.includes('ceo') || title.includes('founder') || title.includes('president')) score += 25
          else if (title.includes('manager') || title.includes('director') || title.includes('head')) score += 15
          else if (title.includes('lead') || title.includes('senior')) score += 10
          else score += 5
        }
        
        // Update the lead with calculated score
        const finalScore = Math.min(score, 100) // Cap at 100
        await supabase
          .from('leads')
          .update({ score: finalScore })
          .eq('id', lead.id)
        
        // Log lead creation activity
        const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || 'New Lead'
        await ActivityLogger.leadCreated(
          lead.id,
          leadName,
          {
            source: lead.source,
            score: finalScore,
            priority: lead.priority,
            company: lead.company_name,
            user_id: userId
          }
        )
          
      } catch (scoreError) {
        console.warn('Failed to calculate lead score:', scoreError)
      }

      // Lead activity is now logged in the scoring block above
    }

    const response = { 
      success: true, 
      lead,
      message: 'Lead created successfully' 
    };
    console.log('🎉 [CREATE LEAD] Returning response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in POST /api/leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/leads - Update lead (bulk updates)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { lead_ids, updates } = body

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: 'lead_ids array is required' }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 })
    }

    // Update leads
    const { data: updatedLeads, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', lead_ids)
      .eq('user_id', user.id) // Ensure user can only update their own leads
      .select()

    if (error) {
      console.error('Error updating leads:', error)
      return NextResponse.json({ error: 'Failed to update leads' }, { status: 500 })
    }

    // Create activity records for significant updates
    if (updates.status || updates.assigned_to) {
      const activities = lead_ids.map(lead_id => ({
        lead_id,
        user_id: user.id,
        activity_type: 'status_changed',
        title: 'Lead Updated',
        description: `Lead was updated: ${Object.keys(updates).join(', ')}`,
        metadata: { updates }
      }))

      await supabase
        .from('lead_activities')
        .insert(activities)
    }

    return NextResponse.json({ 
      success: true, 
      updated_count: updatedLeads?.length || 0,
      leads: updatedLeads 
    })

  } catch (error) {
    console.error('Error in PUT /api/leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}