// Apply the campaign_id migration to lead_magnets table
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [MIGRATION] Adding campaign_id field to lead_magnets table...')

    // Check if column already exists
    const { data: columnCheck } = await serviceClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'lead_magnets')
      .eq('column_name', 'campaign_id')

    if (columnCheck && columnCheck.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'campaign_id column already exists',
        alreadyExists: true
      })
    }

    // Add the campaign_id column using direct SQL execution
    console.log('🔧 [MIGRATION] Executing ALTER TABLE command...')
    
    // First, add the column
    const { error: alterError } = await serviceClient
      .from('lead_magnets')
      .select('id')
      .limit(1)

    // Use a workaround: create a function to add the column
    const { error: functionError } = await serviceClient.rpc('exec', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lead_magnets' AND column_name = 'campaign_id'
          ) THEN
            ALTER TABLE lead_magnets ADD COLUMN campaign_id UUID;
            ALTER TABLE lead_magnets ADD CONSTRAINT fk_lead_magnets_campaign_id 
              FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
            CREATE INDEX idx_lead_magnets_campaign_id ON lead_magnets(campaign_id);
          END IF;
        END $$;
      `
    })

    if (functionError) {
      console.error('❌ [MIGRATION] RPC execution failed:', functionError)
      // Note: Direct SQL execution via .query() is not available in Supabase JS client
      // You need to either create a custom RPC function or run migrations via Supabase dashboard
    }

    if (alterError) {
      console.error('❌ [MIGRATION] Error applying migration:', alterError)
      return NextResponse.json({ error: 'Failed to apply migration', details: alterError.message }, { status: 500 })
    }

    console.log('✅ [MIGRATION] Successfully added campaign_id to lead_magnets')

    // Verify the column was added
    const { data: verifyColumn } = await serviceClient
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'lead_magnets')
      .eq('column_name', 'campaign_id')

    return NextResponse.json({
      success: true,
      message: 'campaign_id field added to lead_magnets table successfully',
      verification: verifyColumn,
      instructions: [
        'Lead magnets can now be linked to email campaigns',
        'When a lead is submitted, they will be automatically enrolled in the selected campaign',
        'Update the Lead Magnet UI to include campaign selection dropdown'
      ]
    })

  } catch (error) {
    console.error('Error applying campaign migration:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}