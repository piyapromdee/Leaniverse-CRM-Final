import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        message: 'Please sign in first'
      }, { status: 401 })
    }

    // Check for contact_lists table
    const { data: listsCheck, error: listsError } = await supabase
      .from('contact_lists')
      .select('count')
      .limit(1)

    // Check for contact_list_members table
    const { data: membersCheck, error: membersError } = await supabase
      .from('contact_list_members')
      .select('count')
      .limit(1)

    // Check for campaigns table
    const { data: campaignsCheck, error: campaignsError } = await supabase
      .from('campaigns')
      .select('count')
      .limit(1)

    // Check for campaign_recipients table
    const { data: recipientsCheck, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('count')
      .limit(1)

    // Check for contacts table
    const { data: contactsCheck, error: contactsError } = await supabase
      .from('contacts')
      .select('count')
      .limit(1)

    return NextResponse.json({
      status: 'Database Check Results',
      tables: {
        contact_lists: {
          exists: !listsError,
          error: listsError?.message || null
        },
        contact_list_members: {
          exists: !membersError,
          error: membersError?.message || null
        },
        campaigns: {
          exists: !campaignsError,
          error: campaignsError?.message || null
        },
        campaign_recipients: {
          exists: !recipientsError,
          error: recipientsError?.message || null
        },
        contacts: {
          exists: !contactsError,
          error: contactsError?.message || null
        }
      },
      message: 'Check which tables need to be created in Supabase',
      sqlScriptNeeded: (!listsError && !membersError) ? false : true
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}