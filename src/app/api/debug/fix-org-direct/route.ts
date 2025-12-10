// Direct fix using service client to bypass RLS
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('🔧 [DIRECT FIX] Starting org_id fix with service client...')

    const ORG_ID = '8a6b275c-4265-4c46-a680-8cd4b78f14db'
    const ADMIN_USER_ID = '1b0bfda8-d888-4ceb-8170-5cfc156f3277'
    const SALES_J_USER_ID = 'fff0197f-6492-4435-bc5e-672282ceef83'

    // Step 1: Create organization if not exists
    const { data: orgData, error: orgError } = await serviceClient
      .from('organizations')
      .upsert({
        id: ORG_ID,
        name: 'Dummi & Co',
        slug: 'dummi-co',
        plan: 'enterprise',
        max_users: 100,
        max_contacts: 10000
      })
      .select()

    console.log('🔧 [DIRECT FIX] Organization upsert result:', { orgData, orgError })

    // Step 2: Check current profile states
    const { data: currentProfiles, error: currentError } = await serviceClient
      .from('profiles')
      .select('id, first_name, last_name, role, org_id')
      .in('id', [ADMIN_USER_ID, SALES_J_USER_ID])

    console.log('🔧 [DIRECT FIX] Current profiles:', { currentProfiles, currentError })

    // Step 3: Update profiles with correct org_id
    const { data: profileUpdate, error: profilesError } = await serviceClient
      .from('profiles')
      .update({ org_id: ORG_ID })
      .in('id', [ADMIN_USER_ID, SALES_J_USER_ID])
      .select()

    console.log('🔧 [DIRECT FIX] Profiles update result:', { profileUpdate, profilesError })

    // Step 4: Check all leads and their org_id
    const { data: allLeads, error: allLeadsError } = await serviceClient
      .from('leads')
      .select('id, email, org_id')
      .limit(10)

    console.log('🔧 [DIRECT FIX] Sample leads:', { allLeads, allLeadsError })

    // Step 5: Update leads with null org_id
    const { data: leadsUpdate, error: leadsError } = await serviceClient
      .from('leads')
      .update({ org_id: ORG_ID })
      .is('org_id', null)
      .select('id, email, org_id')

    console.log('🔧 [DIRECT FIX] Leads update result:', { leadsUpdate, leadsError })

    // Step 6: Final verification - get updated profiles
    const { data: finalProfiles, error: finalError } = await serviceClient
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

    console.log('🔧 [DIRECT FIX] Final verification:', { finalProfiles, finalError })

    // Step 7: Count leads by org_id
    const { data: leadCount, error: countError } = await serviceClient
      .from('leads')
      .select('org_id')
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        
        const counts = data?.reduce((acc: Record<string, number>, lead) => {
          const orgId = lead.org_id || 'null'
          acc[orgId] = (acc[orgId] || 0) + 1
          return acc
        }, {}) || {}
        
        return { data: counts, error: null }
      })

    console.log('🔧 [DIRECT FIX] Lead counts by org_id:', { leadCount, countError })

    return NextResponse.json({
      success: true,
      message: 'Direct org_id fix completed using service client',
      results: {
        organization: orgData?.[0] || null,
        currentProfiles: currentProfiles || [],
        updatedProfiles: profileUpdate || [],
        finalProfiles: finalProfiles || [],
        sampleLeads: allLeads || [],
        updatedLeads: leadsUpdate || [],
        leadCountsByOrgId: leadCount || {},
        errors: {
          orgError: orgError?.message || null,
          profilesError: profilesError?.message || null,
          leadsError: leadsError?.message || null,
          finalError: finalError?.message || null,
          countError: countError?.message || null
        }
      }
    })

  } catch (error) {
    console.error('Error in direct fix endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}