// Debug endpoint to check profiles and org_ids
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 [DEBUG PROFILES] Current user:', user.id, user.email)

    // Get all profiles with org info
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        org_id,
        organizations:org_id (
          id,
          name,
          slug
        )
      `)
    
    console.log('🔍 [DEBUG PROFILES] Profiles query result:', { profiles, profilesError })

    // Get all organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug')
    
    console.log('🔍 [DEBUG PROFILES] Organizations:', { organizations, orgsError })

    // Get lead distribution by org_id
    const { data: leadStats, error: leadStatsError } = await supabase
      .from('leads')
      .select('org_id')
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        
        const stats = data?.reduce((acc: Record<string, number>, lead) => {
          const orgId = lead.org_id || 'null'
          acc[orgId] = (acc[orgId] || 0) + 1
          return acc
        }, {})
        
        return { data: stats, error: null }
      })

    console.log('🔍 [DEBUG PROFILES] Lead stats by org_id:', { leadStats, leadStatsError })

    // Test the get_user_org_id() function
    const { data: currentUserOrgId, error: orgIdError } = await supabase
      .rpc('get_user_org_id')

    console.log('🔍 [DEBUG PROFILES] Current user org_id from function:', { currentUserOrgId, orgIdError })

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email
      },
      currentUserOrgId,
      profiles: profiles || [],
      organizations: organizations || [],
      leadStatsByOrgId: leadStats || {},
      errors: {
        profilesError: profilesError?.message || null,
        orgsError: orgsError?.message || null,
        leadStatsError: leadStatsError?.message || null,
        orgIdError: orgIdError?.message || null
      }
    })

  } catch (error) {
    console.error('Error in debug profiles endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}