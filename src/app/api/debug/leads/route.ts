// Debug endpoint to check leads access
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

    console.log('🔍 [DEBUG LEADS] User ID:', user.id)

    // Test 1: Try to get leads WITHOUT any filters
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('id, email, org_id, user_id')
      .limit(5)
    
    console.log('🔍 [DEBUG LEADS] All leads (no filters):', allLeads?.length || 0, 'Error:', allError)

    // Test 2: Try with specific org_id
    const ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
    const { data: orgLeads, error: orgError } = await supabase
      .from('leads')
      .select('id, email, org_id, user_id')
      .eq('org_id', ORG_ID)
      .limit(5)
    
    console.log('🔍 [DEBUG LEADS] Org leads:', orgLeads?.length || 0, 'Error:', orgError)

    // Test 3: Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('get_table_rls_status', { table_name: 'leads' })
      .single()

    console.log('🔍 [DEBUG LEADS] RLS Status:', rlsStatus, 'Error:', rlsError || 'RLS check not available')

    // Test 4: Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, org_id')
      .eq('id', user.id)
      .single()
    
    console.log('🔍 [DEBUG LEADS] User profile:', profile)

    return NextResponse.json({
      userId: user.id,
      userEmail: user.email,
      profile,
      tests: {
        allLeads: {
          count: allLeads?.length || 0,
          error: allError?.message || null,
          sample: allLeads?.slice(0, 2) || []
        },
        orgLeads: {
          count: orgLeads?.length || 0,
          error: orgError?.message || null,
          sample: orgLeads?.slice(0, 2) || []
        },
        rlsStatus: rlsStatus || 'Could not check RLS status'
      }
    })

  } catch (error) {
    console.error('Error in debug leads endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}