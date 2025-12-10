import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use service role key to bypass RLS and see all leads
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔍 DEBUG: Checking all lead statuses...')

    // Get all leads with their status
    const { data: allLeads, error } = await serviceClient
      .from('leads')
      .select('id, first_name, last_name, email, status, source, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('📊 Total leads in database:', allLeads?.length || 0)
    
    // Group by status
    const statusGroups = allLeads?.reduce((acc, lead) => {
      const status = lead.status || 'unknown'
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push({
        name: `${lead.first_name} ${lead.last_name}`,
        email: lead.email,
        source: lead.source
      })
      return acc
    }, {} as Record<string, any[]>) || {}

    console.log('📋 Leads by status:')
    Object.entries(statusGroups).forEach(([status, leads]) => {
      console.log(`  ${status}: ${leads.length} leads`)
      leads.forEach(lead => {
        console.log(`    - ${lead.name} (${lead.email}) - Source: ${lead.source}`)
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        totalLeads: allLeads?.length || 0,
        statusGroups,
        allLeads: allLeads || []
      }
    })

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}