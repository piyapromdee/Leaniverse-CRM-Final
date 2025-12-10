import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get lead ID from params
    const { id: leadId } = await params
    console.log('🔍 [ASSIGN LEAD] Lead ID:', leadId)

    // Parse request body
    const body = await request.json()
    const { assigned_to } = body
    console.log('🔍 [ASSIGN LEAD] Assign to user ID:', assigned_to)

    if (!assigned_to) {
      return NextResponse.json(
        { error: 'assigned_to is required' },
        { status: 400 }
      )
    }

    // First, check if the lead exists
    const { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, assigned_to')
      .eq('id', leadId)
      .single()

    console.log('🔍 [ASSIGN LEAD] Existing lead:', existingLead)
    console.log('🔍 [ASSIGN LEAD] Lead error:', leadError)

    if (leadError || !existingLead) {
      console.error('❌ [ASSIGN LEAD] Lead not found:', leadId)
      return NextResponse.json(
        { error: `Lead not found with ID: ${leadId}` },
        { status: 404 }
      )
    }

    // Verify the assigned user exists and has sales role
    const { data: assignedUser, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', assigned_to)
      .single()

    console.log('🔍 [ASSIGN LEAD] Assigned user:', assignedUser)
    console.log('🔍 [ASSIGN LEAD] User error:', userError)

    if (userError || !assignedUser) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    if (assignedUser.role !== 'sales' && assignedUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'User must have sales or admin role' },
        { status: 400 }
      )
    }

    // Update the lead assignment
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        assigned_to,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single()

    console.log('🔍 [ASSIGN LEAD] Updated lead:', updatedLead)
    console.log('🔍 [ASSIGN LEAD] Update error:', updateError)

    if (updateError || !updatedLead) {
      console.error('❌ [ASSIGN LEAD] Failed to update lead:', updateError)
      return NextResponse.json(
        { error: 'Failed to update lead assignment', details: updateError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      assigned_user_name: `${assignedUser.first_name} ${assignedUser.last_name}`
    })

  } catch (error) {
    console.error('Error in lead update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
