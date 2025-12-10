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

    // Get date range and assignee from query parameters
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'all_time'
    const startDateParam = searchParams.get('startDate')
    const assignee = searchParams.get('assignee')

    // Calculate date boundaries based on selected range or use provided startDate
    const now = new Date()
    let startDate: Date | null = null

    if (startDateParam && startDateParam !== 'null') {
      startDate = new Date(startDateParam)
    } else {
      switch (dateRange) {
        case 'this_quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
          break
        case 'last_30_days':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 30)
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'all_time':
        default:
          startDate = null // No date filtering for all time
          break
      }
    }

    console.log(`📊 [TOP PERFORMERS] Date Range: ${dateRange}, Start Date: ${startDate?.toISOString() || 'All Time'}, Assignee: ${assignee || 'All'}`)

    // Get sales team members (filter by specific assignee if provided)
    let salesRepsQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'sales')

    // If filtering by specific assignee, only get that user
    if (assignee && assignee !== 'all') {
      salesRepsQuery = salesRepsQuery.eq('id', assignee)
    }

    const { data: salesReps } = await salesRepsQuery

    if (!salesReps || salesReps.length === 0) {
      return NextResponse.json({ performers: [] })
    }

    // Get performance data for each sales rep
    const performersWithData = await Promise.all(
      salesReps.map(async (rep) => {
        // Get all won deals by this rep
        const { data: wonDeals, error: dealsError } = await supabase
          .from('deals')
          .select('value, closed_date, updated_at, stage')
          .eq('assigned_to', rep.id)
          .eq('stage', 'won')

        console.log(`📊 [TOP PERFORMERS] ${rep.first_name} ${rep.last_name}:`, {
          wonDealsCount: wonDeals?.length || 0,
          deals: wonDeals,
          error: dealsError
        })

        // Filter deals by date range (use closed_date if available, otherwise updated_at)
        // If startDate is null (all_time), don't filter by date
        const filteredDeals = startDate
          ? (wonDeals?.filter(deal => {
              const dealDate = deal.closed_date ? new Date(deal.closed_date) : new Date(deal.updated_at)
              return dealDate >= startDate
            }) || [])
          : (wonDeals || [])

        console.log(`📊 [TOP PERFORMERS] ${rep.first_name} filtered deals (${dateRange}):`, {
          totalWonDeals: wonDeals?.length || 0,
          dealsInRange: filteredDeals.length,
          filteredDeals: filteredDeals.map(d => ({ value: d.value, closed_date: d.closed_date, updated_at: d.updated_at }))
        })

        // Calculate revenue from filtered deals
        const revenue = filteredDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)
        const deals_closed = filteredDeals.length

        console.log(`📊 [TOP PERFORMERS] ${rep.first_name} calculated revenue:`, revenue, 'deals:', deals_closed)

        return {
          id: rep.id,
          first_name: rep.first_name || 'Unknown',
          last_name: rep.last_name || 'User',
          email: rep.email,
          revenue,
          deals_closed
        }
      })
    )

    console.log(`📊 [TOP PERFORMERS] Final performers data:`, performersWithData)

    // Sort by revenue (highest first) and take top 5
    const topPerformers = performersWithData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return NextResponse.json({ performers: topPerformers })
  } catch (error) {
    console.error('Error fetching top performers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top performers' },
      { status: 500 }
    )
  }
}
