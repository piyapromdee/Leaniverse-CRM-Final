import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/get-user-org'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { error: orgError, userId, role } = await getUserOrgId()
    if (orgError || (role !== 'admin' && role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch calendar events without joins
    const { data: eventsData, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .not('date', 'is', null)
      .order('start_time', { ascending: true })

    if (eventsError) {
      console.error('Error fetching team calendar events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch team calendar events', details: eventsError.message },
        { status: 500 }
      )
    }

    if (!eventsData || eventsData.length === 0) {
      return NextResponse.json({ events: [] })
    }

    // Get unique assignee, contact, and deal IDs
    const assigneeIds = [...new Set(eventsData.map(e => e.assigned_to).filter(Boolean))]
    const contactIds = [...new Set(eventsData.map(e => e.contact_id).filter(Boolean))]
    const dealIds = [...new Set(eventsData.map(e => e.deal_id).filter(Boolean))]

    // Fetch related data in parallel
    const [profilesData, contactsData, dealsData] = await Promise.all([
      assigneeIds.length > 0
        ? supabase.from('profiles').select('id, first_name, last_name').in('id', assigneeIds)
        : Promise.resolve({ data: [] }),
      contactIds.length > 0
        ? supabase.from('contacts').select('id, name, first_name, last_name').in('id', contactIds)
        : Promise.resolve({ data: [] }),
      dealIds.length > 0
        ? supabase.from('deals').select('id, name, title').in('id', dealIds)
        : Promise.resolve({ data: [] })
    ])

    // Create lookup maps
    const profilesMap = new Map((profilesData.data || []).map(p => [p.id, p]))
    const contactsMap = new Map((contactsData.data || []).map(c => [c.id, c]))
    const dealsMap = new Map((dealsData.data || []).map(d => [d.id, d]))

    // Combine data
    const events = eventsData.map(event => ({
      ...event,
      assignee: event.assigned_to ? profilesMap.get(event.assigned_to) : null,
      contact: event.contact_id ? contactsMap.get(event.contact_id) : null,
      deal: event.deal_id ? dealsMap.get(event.deal_id) : null
    }))

    return NextResponse.json({ events: events || [] })
  } catch (error) {
    console.error('Error in team calendar API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
