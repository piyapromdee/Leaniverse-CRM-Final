import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Get unique assigned user IDs
    const assignedUserIds = [...new Set(
      leads?.filter(lead => lead.assigned_to).map(lead => lead.assigned_to) || []
    )]

    // Fetch assigned user names
    let userMap: Record<string, string> = {}
    if (assignedUserIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', assignedUserIds)

      if (users) {
        userMap = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name} ${user.last_name}`
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Format the leads to include assigned_user_name
    const formattedLeads = leads?.map(lead => ({
      ...lead,
      assigned_user_name: lead.assigned_to ? userMap[lead.assigned_to] || null : null
    })) || []

    return NextResponse.json({
      success: true,
      leads: formattedLeads
    })

  } catch (error) {
    console.error('Error in leads API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}