// Check the actual lead_magnets table schema
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔍 [CHECK SCHEMA] Checking lead_magnets table schema...')

    // First, try to get one record to see the column structure
    const { data: magnets, error: selectError } = await serviceClient
      .from('lead_magnets')
      .select('*')
      .limit(1)

    if (selectError) {
      console.error('❌ [CHECK SCHEMA] Error selecting from lead_magnets:', selectError)
    }

    // Get the column names from the first row
    const columns = magnets && magnets.length > 0 ? Object.keys(magnets[0]) : []
    
    console.log('📋 [CHECK SCHEMA] Lead magnets table columns:', columns)

    return NextResponse.json({
      success: true,
      message: 'Lead magnets schema check complete',
      results: {
        totalColumns: columns.length,
        allColumns: columns,
        hasCampaignId: columns.includes('campaign_id'),
        sample: magnets && magnets.length > 0 ? magnets[0] : null,
        error: selectError?.message || null
      }
    })

  } catch (error) {
    console.error('Error checking lead magnets schema:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}