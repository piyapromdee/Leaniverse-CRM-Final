import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/get-user-org'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { error: orgError, userId, role } = await getUserOrgId()
    if (orgError || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const assignee = searchParams.get('assignee')

    // Get team members count
    const { count: teamMembersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'sales')

    // Get active deals (discovery, proposal, negotiation)
    let activeDealsQuery = supabase
      .from('deals')
      .select('value')
      .in('stage', ['discovery', 'proposal', 'negotiation'])

    // Apply date filter to active deals
    if (startDateParam && startDateParam !== 'null') {
      activeDealsQuery = activeDealsQuery.gte('created_at', startDateParam)
    }

    // Apply assignee filter to active deals
    if (assignee && assignee !== 'all') {
      activeDealsQuery = activeDealsQuery.eq('assigned_to', assignee)
    }

    const { data: activeDeals } = await activeDealsQuery

    const activeDealsCount = activeDeals?.length || 0
    const pipelineValue = activeDeals?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0

    // Get won deals
    let wonDealsQuery = supabase
      .from('deals')
      .select('value')
      .eq('stage', 'won')

    // Apply date filter to won deals (use closed_date for won deals)
    if (startDateParam && startDateParam !== 'null') {
      wonDealsQuery = wonDealsQuery.gte('closed_date', startDateParam)
    } else {
      // Default to this month if no filter
      const currentMonth = new Date()
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      wonDealsQuery = wonDealsQuery.gte('closed_date', firstDayOfMonth.toISOString())
    }

    // Apply assignee filter to won deals
    if (assignee && assignee !== 'all') {
      wonDealsQuery = wonDealsQuery.eq('assigned_to', assignee)
    }

    const { data: wonDeals } = await wonDealsQuery

    const wonDealsCount = wonDeals?.length || 0
    const totalRevenue = wonDeals?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0

    // Get lost deals
    let lostDealsQuery = supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'lost')

    // Apply date filter to lost deals (use lost_date for lost deals)
    if (startDateParam && startDateParam !== 'null') {
      lostDealsQuery = lostDealsQuery.gte('lost_date', startDateParam)
    } else {
      // Default to this month if no filter
      const currentMonth = new Date()
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      lostDealsQuery = lostDealsQuery.gte('lost_date', firstDayOfMonth.toISOString())
    }

    // Apply assignee filter to lost deals
    if (assignee && assignee !== 'all') {
      lostDealsQuery = lostDealsQuery.eq('assigned_to', assignee)
    }

    const { count: lostDealsCount } = await lostDealsQuery

    // Get total deals (won + lost)
    const totalDeals = wonDealsCount + (lostDealsCount || 0)

    // Get total leads
    let leadsQuery = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    // Apply date filter to leads
    if (startDateParam && startDateParam !== 'null') {
      leadsQuery = leadsQuery.gte('created_at', startDateParam)
    } else {
      // Default to this month if no filter
      const currentMonth = new Date()
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      leadsQuery = leadsQuery.gte('created_at', firstDayOfMonth.toISOString())
    }

    // Apply assignee filter to leads
    if (assignee && assignee !== 'all') {
      leadsQuery = leadsQuery.eq('assigned_to', assignee)
    }

    const { count: totalLeads } = await leadsQuery

    // Get overdue tasks count
    const today = new Date().toISOString().split('T')[0]
    let overdueTasksQuery = supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('date', today)

    // Apply assignee filter to overdue tasks
    if (assignee && assignee !== 'all') {
      overdueTasksQuery = overdueTasksQuery.eq('assigned_to', assignee)
    }

    const { count: overdueTasksCount } = await overdueTasksQuery

    // Set company targets (these would normally come from a settings table)
    const targetRevenue = 1000000 // 1M THB
    const targetDeals = 20
    const targetLeads = 100

    const metrics = {
      totalRevenue,
      targetRevenue,
      totalDeals,
      targetDeals,
      totalLeads: totalLeads || 0,
      targetLeads,
      activeDealsCount,
      wonDealsCount,
      lostDealsCount: lostDealsCount || 0,
      pipelineValue,
      overdueTasksCount: overdueTasksCount || 0,
      teamMembersCount: teamMembersCount || 0
    }

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Error fetching team metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team metrics' },
      { status: 500 }
    )
  }
}
