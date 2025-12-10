// Duplicate Lead API endpoint
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger } from '@/lib/activity-logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 Duplicate API called')
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error in duplicate:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params
    console.log('🔄 Duplicating lead ID:', leadId)

    // Get the original lead
    const { data: originalLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      console.error('Error fetching lead to duplicate:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
    }

    // Create duplicate with modified data - exclude system fields
    const {
      id,
      created_at,
      updated_at,
      org_id,
      ...leadDataToCopy
    } = originalLead

    const duplicateData = {
      ...leadDataToCopy,
      first_name: originalLead.first_name ? `${originalLead.first_name} (Copy)` : '(Copy)',
      email: originalLead.email ? `copy_${Date.now()}_${originalLead.email}` : `copy_${Date.now()}@example.com`,
      status: 'new', // Reset status for duplicate
      user_id: user.id, // Assign to current user
      // org_id will be auto-set by trigger
    }

    console.log('🔄 Duplicate data prepared:', duplicateData)

    // Insert the duplicate lead
    const { data: duplicatedLead, error: insertError } = await supabase
      .from('leads')
      .insert(duplicateData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating duplicate lead:', insertError)
      return NextResponse.json({ error: insertError.message || 'Failed to create duplicate lead' }, { status: 500 })
    }

    console.log('✅ Lead duplicated successfully:', duplicatedLead)

    // Log the duplication activity
    const originalLeadName = `${originalLead.first_name || ''} ${originalLead.last_name || ''}`.trim() || originalLead.company_name || 'Lead'
    const duplicatedLeadName = `${duplicatedLead.first_name || ''} ${duplicatedLead.last_name || ''}`.trim() || duplicatedLead.company_name || 'Lead'
    
    await ActivityLogger.leadCreated(
      duplicatedLead.id,
      duplicatedLeadName,
      {
        source: 'duplicate',
        original_lead_id: leadId,
        original_lead_name: originalLeadName,
        user_id: user.id
      }
    )

    return NextResponse.json({
      success: true,
      lead: duplicatedLead,
      message: 'Lead duplicated successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/leads/[id]/duplicate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}