import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Use service role key to bypass RLS and delete mock leads
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🧹 Starting mock leads cleanup...')

    // Get all leads first to identify mock ones
    const { data: allLeads, error: fetchError } = await serviceClient
      .from('leads')
      .select('id, first_name, last_name, email, company_name, source')

    if (fetchError) {
      console.error('❌ Error fetching leads:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    console.log('📊 Total leads found:', allLeads?.length || 0)

    // Identify mock leads
    const mockLeads = allLeads?.filter(lead => 
      (lead.first_name === 'John' && lead.last_name === 'Doe') ||
      (lead.first_name === 'High' && lead.last_name === 'Scorer') ||
      (lead.email && (
        lead.email.includes('john.doe') ||
        lead.email.includes('johndoe') ||
        lead.email.includes('highscorer') ||
        lead.email.includes('example.com') ||
        lead.email.includes('test.com') ||
        lead.email.includes('demo.com') ||
        lead.email.includes('mock.com')
      )) ||
      (lead.company_name && (
        lead.company_name.includes('Example') ||
        lead.company_name.includes('Test') ||
        lead.company_name.includes('Mock') ||
        lead.company_name.includes('Demo')
      ))
    ) || []

    console.log('🎭 Mock leads to delete:', mockLeads.length)

    if (mockLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No mock leads found to delete',
        deletedCount: 0
      })
    }

    // Log what we're about to delete
    mockLeads.forEach(lead => {
      console.log(`- Deleting mock lead: ${lead.first_name} ${lead.last_name} (${lead.email}) - ID: ${lead.id}`)
    })

    // Delete mock leads
    const mockLeadIds = mockLeads.map(lead => lead.id)
    const { error: deleteError } = await serviceClient
      .from('leads')
      .delete()
      .in('id', mockLeadIds)

    if (deleteError) {
      console.error('❌ Error deleting mock leads:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log(`✅ Successfully deleted ${mockLeads.length} mock leads`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${mockLeads.length} mock leads`,
      deletedCount: mockLeads.length,
      deletedLeads: mockLeads.map(lead => ({
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        email: lead.email
      }))
    })

  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}