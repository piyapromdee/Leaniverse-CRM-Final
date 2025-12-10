// Lead Sources API endpoints
// NEW FILE - doesn't affect existing APIs

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/leads/sources - Fetch all lead sources for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch lead sources with stats
    const { data: sources, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (error) {
      console.error('Error fetching lead sources:', error)
      return NextResponse.json({ error: 'Failed to fetch lead sources' }, { status: 500 })
    }

    // If no sources exist, create default ones
    if (!sources || sources.length === 0) {
      try {
        await supabase.rpc('create_default_lead_sources', { user_id_param: user.id })
        
        // Fetch the newly created sources
        const { data: newSources } = await supabase
          .from('lead_sources')
          .select('*')
          .eq('user_id', user.id)
          .order('name')

        return NextResponse.json({ sources: newSources || [] })
      } catch (defaultError) {
        console.error('Error creating default sources:', defaultError)
        return NextResponse.json({ sources: [] })
      }
    }

    return NextResponse.json({ sources })

  } catch (error) {
    console.error('Error in GET /api/leads/sources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leads/sources - Create a new lead source
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Source name is required' }, { status: 400 })
    }

    // Prepare source data
    const sourceData = {
      user_id: user.id,
      name: body.name.trim(),
      description: body.description || null,
      category: body.category || 'other',
      cost_per_lead: body.cost_per_lead || 0,
      is_active: body.is_active !== undefined ? body.is_active : true
    }

    // Insert the source
    const { data: source, error } = await supabase
      .from('lead_sources')
      .insert([sourceData])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead source:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A source with this name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create lead source' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      source,
      message: 'Lead source created successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/leads/sources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/leads/sources - Update lead source stats (automated by system)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Recalculate stats for all sources
    const { data: sources } = await supabase
      .from('lead_sources')
      .select('id, name')
      .eq('user_id', user.id)

    if (!sources) {
      return NextResponse.json({ error: 'No sources found' }, { status: 404 })
    }

    const updates = []

    for (const source of sources) {
      // Count total leads for this source
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', source.name)

      // Count converted leads for this source
      const { count: convertedLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', source.name)
        .eq('status', 'converted')

      const conversionRate = totalLeads && totalLeads > 0 
        ? (convertedLeads || 0) / totalLeads * 100 
        : 0

      updates.push({
        id: source.id,
        total_leads: totalLeads || 0,
        converted_leads: convertedLeads || 0,
        conversion_rate: Math.round(conversionRate * 100) / 100 // Round to 2 decimal places
      })
    }

    // Update each source
    for (const update of updates) {
      await supabase
        .from('lead_sources')
        .update({
          total_leads: update.total_leads,
          converted_leads: update.converted_leads,
          conversion_rate: update.conversion_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)
    }

    return NextResponse.json({ 
      success: true,
      updated_sources: updates.length,
      message: 'Lead source stats updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/leads/sources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}