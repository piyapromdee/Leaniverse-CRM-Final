import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Fetch real stats for a lead magnet from leads table
async function fetchRealLeadStats(magnetSlug: string) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find leads by exact source match (using the actual slug)
    const { data: leads, error } = await serviceClient
      .from('leads')
      .select('*')
      .eq('source', magnetSlug)
    
    if (error) {
      console.log('Error fetching leads for stats:', error)
      return { leads_generated: 0, downloads: 0 }
    }
    
    console.log('📊 Found leads for', magnetSlug, ':', leads?.length || 0)
    
    return { 
      leads_generated: leads?.length || 0,
      downloads: leads?.length || 0 // Assuming each lead submission is a "download"
    }
  } catch (error) {
    console.log('Error in fetchRealLeadStats:', error)
    return { leads_generated: 0, downloads: 0 }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch real lead magnets from database
    console.log('📊 Fetching lead magnets from database...')
    
    const { data: magnets, error: fetchError } = await supabase
      .from('lead_magnets')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching lead magnets:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch lead magnets' }, { status: 500 })
    }

    // If no magnets exist, return empty array
    if (!magnets || magnets.length === 0) {
      return NextResponse.json([])
    }

    // Add real statistics to each magnet
    const magnetsWithStats = await Promise.all(
      magnets.map(async (magnet) => {
        const stats = await fetchRealLeadStats(magnet.slug || magnet.id)
        return {
          ...magnet,
          ...stats  // Spread the stats directly into the magnet object
        }
      })
    )

    return NextResponse.json(magnetsWithStats)
  } catch (error) {
    console.error('Error in GET /api/lead-magnets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Generate slug if not provided
    if (!body.slug) {
      body.slug = body.title.toLowerCase().replace(/\s+/g, '-')
    }

    const { data: magnet, error } = await supabase
      .from('lead_magnets')
      .insert([{
        ...body,
        user_id: user.id,
        is_active: true
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead magnet:', error)
      return NextResponse.json({ error: 'Failed to create lead magnet' }, { status: 500 })
    }

    return NextResponse.json(magnet)
  } catch (error) {
    console.error('Error in POST /api/lead-magnets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}