import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { organizationSlug } = await request.json()
    
    console.log('🔄 [ORG SWITCH] User switching to organization:', organizationSlug)

    // Get the target organization
    const { data: targetOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', organizationSlug)
      .single()

    if (orgError || !targetOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('🔄 [ORG SWITCH] Target organization:', targetOrg)

    // Update user's profile to switch organizations
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        org_id: targetOrg.id,
        is_org_admin: true // For testing purposes, make them admin
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('🔥 [ORG SWITCH] Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to switch organization' }, { status: 500 })
    }

    console.log('✅ [ORG SWITCH] Successfully switched to:', targetOrg.name)

    return NextResponse.json({
      success: true,
      organization: targetOrg,
      message: `Switched to ${targetOrg.name}`
    })

  } catch (error) {
    console.error('🔥 [ORG SWITCH] Error:', error)
    return NextResponse.json({ 
      error: 'Switch failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}