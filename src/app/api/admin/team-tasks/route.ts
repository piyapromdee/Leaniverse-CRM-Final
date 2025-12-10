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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const assignee = searchParams.get('assignee')
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    // First, fetch calendar events without joins
    let tasksQuery = supabase
      .from('calendar_events')
      .select('*')

    // Filter out completed tasks unless explicitly requested
    if (!includeCompleted) {
      tasksQuery = tasksQuery.neq('status', 'completed').neq('status', 'cancelled')
    }

    // Apply date filter
    if (startDateParam && startDateParam !== 'null') {
      tasksQuery = tasksQuery.gte('date', startDateParam)
    }

    if (endDateParam && endDateParam !== 'null') {
      tasksQuery = tasksQuery.lte('date', endDateParam)
    }

    // Apply assignee filter
    if (assignee && assignee !== 'all') {
      tasksQuery = tasksQuery.eq('assigned_to', assignee)
    }

    const { data: tasksData, error: tasksError } = await tasksQuery
      .order('date', { ascending: true })

    if (tasksError) {
      console.error('Error fetching team tasks:', tasksError)
      return NextResponse.json(
        { error: 'Failed to fetch team tasks', details: tasksError.message },
        { status: 500 }
      )
    }

    if (!tasksData || tasksData.length === 0) {
      return NextResponse.json({ tasks: [] })
    }

    // Get unique assignee, contact, and deal IDs
    const assigneeIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))]
    const contactIds = [...new Set(tasksData.map(t => t.contact_id).filter(Boolean))]
    const dealIds = [...new Set(tasksData.map(t => t.deal_id).filter(Boolean))]

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
    const tasks = tasksData.map(task => ({
      ...task,
      assignee: task.assigned_to ? profilesMap.get(task.assigned_to) : null,
      contact: task.contact_id ? contactsMap.get(task.contact_id) : null,
      deal: task.deal_id ? dealsMap.get(task.deal_id) : null
    }))

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('Error fetching team tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team tasks' },
      { status: 500 }
    )
  }
}
