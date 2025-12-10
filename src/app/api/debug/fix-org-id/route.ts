// API endpoint to fix org_id for Sales J user
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user (only allow admin to run this)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('🔧 [FIX ORG ID] Running org_id fix for Sales J user...')

    const ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
    const ADMIN_USER_ID = '1b0bfda8-d888-4ceb-8170-5cfc156f3277'
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'

    // Step 1: Create organization if not exists
    const { error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: ORG_ID,
        name: 'Dummi & Co',
        slug: 'dummi-co',
        plan: 'enterprise',
        max_users: 100,
        max_contacts: 10000
      })

    console.log('🔧 [FIX ORG ID] Organization upsert result:', { orgError })

    // Step 2: Update profiles with correct org_id
    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ org_id: ORG_ID })
      .in('id', [ADMIN_USER_ID, SALES_J_USER_ID])

    console.log('🔧 [FIX ORG ID] Profiles update result:', { profilesError })

    // Step 3: Update leads with null org_id
    const { error: leadsError } = await supabase
      .from('leads')
      .update({ org_id: ORG_ID })
      .is('org_id', null)

    console.log('🔧 [FIX ORG ID] Leads update result:', { leadsError })

    // Step 4: Verify the changes
    const { data: updatedProfiles, error: verifyError } = await supabase
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
      .in('id', [ADMIN_USER_ID, SALES_J_USER_ID])

    console.log('🔧 [FIX ORG ID] Verification result:', { updatedProfiles, verifyError })

    // Test get_user_org_id function
    const { data: testOrgId, error: testError } = await supabase
      .rpc('get_user_org_id')

    console.log('🔧 [FIX ORG ID] Test get_user_org_id result:', { testOrgId, testError })

    return NextResponse.json({
      success: true,
      message: 'Org ID fix completed',
      results: {
        organizationCreated: !orgError,
        profilesUpdated: !profilesError,
        leadsUpdated: !leadsError,
        updatedProfiles: updatedProfiles || [],
        currentUserOrgId: testOrgId,
        errors: {
          orgError: orgError?.message || null,
          profilesError: profilesError?.message || null,
          leadsError: leadsError?.message || null,
          verifyError: verifyError?.message || null,
          testError: testError?.message || null
        }
      }
    })

  } catch (error) {
    console.error('Error in fix org-id endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}