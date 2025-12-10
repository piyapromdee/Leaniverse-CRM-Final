import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/get-user-org'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { error: orgError, userId, role } = await getUserOrgId()
    if (orgError || (role !== 'admin' && role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()

    console.log('🔄 [UPDATE CALENDAR EVENT] Event ID:', eventId)
    console.log('🔄 [UPDATE CALENDAR EVENT] Update data:', body)

    // Update the calendar event using server-side Supabase (bypasses RLS)
    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(body)
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ [UPDATE CALENDAR EVENT] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update calendar event', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ [UPDATE CALENDAR EVENT] Success:', updatedEvent)

    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('❌ [UPDATE CALENDAR EVENT] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
