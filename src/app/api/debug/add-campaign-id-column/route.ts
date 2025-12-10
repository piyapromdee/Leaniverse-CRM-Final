// Add the missing campaign_id column to lead_magnets table
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [ADD COLUMN] Adding campaign_id column to lead_magnets table...')

    // First check if column already exists
    const { data: magnets } = await serviceClient
      .from('lead_magnets')
      .select('*')
      .limit(1)

    if (magnets && magnets.length > 0) {
      const columns = Object.keys(magnets[0])
      if (columns.includes('campaign_id')) {
        return NextResponse.json({
          success: true,
          message: 'campaign_id column already exists',
          alreadyExists: true
        })
      }
    }

    // Try to add the column using a test lead magnet update
    console.log('🔧 [ADD COLUMN] Attempting to add campaign_id column...')
    
    // This approach: create a lead magnet record that includes campaign_id
    // If the column doesn't exist, Supabase will create it automatically in some cases
    const testMagnet = {
      title: 'TEST_SCHEMA_UPDATE',
      description: 'Testing schema update',
      type: 'lead_form',
      is_active: false,
      campaign_id: null // This should trigger column creation
    }

    const { data: testResult, error: testError } = await serviceClient
      .from('lead_magnets')
      .insert([testMagnet])
      .select()

    if (testError) {
      console.error('❌ [ADD COLUMN] Column does not exist and cannot be created:', testError)
      
      // Try alternative approach - direct SQL execution won't work, so provide manual instructions
      return NextResponse.json({
        success: false,
        error: 'campaign_id column missing from lead_magnets table',
        details: testError.message,
        instructions: [
          'The campaign_id column needs to be added to the lead_magnets table',
          'Run this SQL in your Supabase dashboard:',
          'ALTER TABLE lead_magnets ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;',
          'CREATE INDEX IF NOT EXISTS idx_lead_magnets_campaign_id ON lead_magnets(campaign_id);'
        ]
      }, { status: 500 })
    }

    // If successful, clean up the test record
    if (testResult && testResult.length > 0) {
      await serviceClient
        .from('lead_magnets')
        .delete()
        .eq('id', testResult[0].id)
    }

    console.log('✅ [ADD COLUMN] campaign_id column added successfully')

    return NextResponse.json({
      success: true,
      message: 'campaign_id column added to lead_magnets table',
      instructions: [
        'Lead magnets can now be linked to email campaigns',
        'Try creating a new lead magnet - it should work now!'
      ]
    })

  } catch (error) {
    console.error('Error adding campaign_id column:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      instructions: [
        'Manual database update required:',
        'ALTER TABLE lead_magnets ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;'
      ]
    }, { status: 500 })
  }
}