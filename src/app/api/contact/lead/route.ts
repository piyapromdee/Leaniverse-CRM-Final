import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      companySize,
      industry,
      budget,
      timeframe,
      message,
      leadSource
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !company || !jobTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use service client to assign lead to a user (since public forms don't have user context)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find a user to assign the lead to (get any admin/owner user, then fallback to any user)
    const { data: { users }, error: usersError } = await serviceClient.auth.admin.listUsers()
    let assignUserId = null
    
    if (!usersError && users && users.length > 0) {
      // TEMPORARY FIX: Assign to the specific user that's currently using the dashboard
      // This is user 1b0bfda8-d888-4ceb-8170-5cfc156f3277 who has sales role
      const dashboardUser = users.find(u => u.id === '1b0bfda8-d888-4ceb-8170-5cfc156f3277')
      
      if (dashboardUser) {
        assignUserId = dashboardUser.id
        console.log('📝 Assigning contact form lead to dashboard user:', assignUserId, 'role:', dashboardUser.user_metadata?.role || 'sales')
      } else {
        // Fallback: Priority: sales > admin > owner > any user
        const salesUser = users.find(u => u.user_metadata?.role === 'sales')
        const adminUser = users.find(u => u.user_metadata?.role === 'admin')
        const ownerUser = users.find(u => u.user_metadata?.role === 'owner') 
        
        assignUserId = salesUser?.id || adminUser?.id || ownerUser?.id || users[0].id
        console.log('📝 Assigning contact form lead to fallback user:', assignUserId, 'role:', salesUser?.user_metadata?.role || adminUser?.user_metadata?.role || ownerUser?.user_metadata?.role || 'unknown')
      }
    }

    // Get the org_id of the assigned user to ensure proper multi-tenancy
    let assignUserOrgId = null
    if (assignUserId) {
      const { data: userProfile } = await serviceClient
        .from('profiles')
        .select('org_id')
        .eq('id', assignUserId)
        .single()
      assignUserOrgId = userProfile?.org_id
    }

    // Create leads table entry with user assignment and org_id
    const leadData = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      company_name: company, // Use company_name to match schema
      job_title: jobTitle,
      company_size: companySize || null,
      industry: industry || null,
      budget_range: budget || null,
      decision_timeline: timeframe || null,
      notes: message || null,
      source: leadSource, // Use 'source' instead of 'lead_source' to match schema
      status: 'new',
      user_id: assignUserId, // CRITICAL: Assign to a user so it shows up in the dashboard
      org_id: assignUserOrgId, // CRITICAL: Assign to the same org as the user for multi-tenancy
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Use service client to create lead to bypass RLS (since this is a public form)
    const { data, error } = await serviceClient
      .from('leads')
      .insert([leadData])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json(
        { error: 'Failed to submit lead form' },
        { status: 500 }
      )
    }

    // TODO: Send notification email to sales team
    // TODO: Add to CRM system if integrated
    // TODO: Send confirmation email to prospect

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lead form submitted successfully',
        leadId: data.id
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error processing lead form:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}