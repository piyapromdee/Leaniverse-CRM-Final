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

    // Get recent activity from all team members (last 50 activities)
    let activitiesQuery = supabase
      .from('activity_logs')
      .select('*')

    // Apply date filter
    if (startDateParam && startDateParam !== 'null') {
      activitiesQuery = activitiesQuery.gte('created_at', startDateParam)
    }

    // Apply assignee filter (user_id in activity_logs)
    if (assignee && assignee !== 'all') {
      activitiesQuery = activitiesQuery.eq('user_id', assignee)
    }

    const { data: activities, error } = await activitiesQuery
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error querying activity_logs:', error)
      return NextResponse.json({ activities: [] })
    }

    // Get user info for each activity
    const activitiesWithUsers = await Promise.all(
      (activities || []).map(async (activity) => {
        const { data: user } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', activity.user_id)
          .single()

        return {
          ...activity,
          user_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown User'
        }
      })
    )

    return NextResponse.json({ activities: activitiesWithUsers })
  } catch (error) {
    console.error('Error fetching team activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team activity' },
      { status: 500 }
    )
  }
}
