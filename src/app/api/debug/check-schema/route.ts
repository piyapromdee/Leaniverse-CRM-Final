// Check the actual leads table schema to see what columns exist
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔍 [CHECK SCHEMA] Checking leads table schema...')

    // First, check what columns exist in the leads table
    const { data: leads, error: selectError } = await serviceClient
      .from('leads')
      .select('*')
      .limit(1)

    if (selectError) {
      console.error('❌ [CHECK SCHEMA] Error selecting from leads:', selectError)
      return NextResponse.json({ error: 'Failed to select from leads table' }, { status: 500 })
    }

    // Get the column names from the first row
    const columns = leads && leads.length > 0 ? Object.keys(leads[0]) : []
    
    console.log('📋 [CHECK SCHEMA] Leads table columns:', columns)

    // Check specifically for reassignment columns
    const hasReassignmentPending = columns.includes('reassignment_pending')
    const hasReassignmentRequestedBy = columns.includes('reassignment_requested_by')
    
    // Also check by trying to query the information_schema
    const { data: schemaInfo, error: schemaError } = await serviceClient
      .rpc('get_column_info', { table_name: 'leads' })
      .select()

    return NextResponse.json({
      success: true,
      message: 'Schema check complete',
      results: {
        totalColumns: columns.length,
        allColumns: columns,
        hasReassignmentColumns: {
          reassignment_pending: hasReassignmentPending,
          reassignment_requested_by: hasReassignmentRequestedBy
        },
        schemaQueryResult: schemaInfo || 'RPC not available',
        schemaQueryError: schemaError?.message || null
      }
    })

  } catch (error) {
    console.error('Error checking schema:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}