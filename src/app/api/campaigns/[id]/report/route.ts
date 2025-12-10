import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: campaignId } = await params

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('📊 [CAMPAIGN REPORT] Loading report for campaign:', campaignId)
    console.log('📊 [CAMPAIGN REPORT] Current user ID:', user.id)

    // Get campaign details (check without user filter first)
    const { data: campaignCheck } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignCheck) {
      console.log('📊 [CAMPAIGN REPORT] Campaign exists with user_id:', campaignCheck.user_id)
      console.log('📊 [CAMPAIGN REPORT] Match:', campaignCheck.user_id === user.id)
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, subject, sent_date, sent_count, opened_count, clicked_count, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id) // Ensure user owns this campaign
      .single()

    if (campaignError || !campaign) {
      console.error('❌ [CAMPAIGN REPORT] Campaign not found')
      console.error('   Error:', JSON.stringify(campaignError, null, 2))
      console.error('   Campaign data:', campaign)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    console.log('✅ [CAMPAIGN REPORT] Campaign found:', campaign.name)

    // Get contacts who opened
    const { data: openedData, error: openedError } = await supabase
      .from('campaign_recipients')
      .select(`
        contact_id,
        opened_count,
        opened_at,
        contacts (
          id,
          name,
          email
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('opened', true)
      .order('opened_at', { ascending: false })

    if (openedError) {
      console.error('❌ [CAMPAIGN REPORT] Error loading opened contacts:', openedError)
    } else {
      console.log('📧 [CAMPAIGN REPORT] Contacts who opened:', openedData?.length || 0)
    }

    // Get contacts who clicked
    const { data: clickedData, error: clickedError } = await supabase
      .from('campaign_recipients')
      .select(`
        contact_id,
        clicked_count,
        clicked_at,
        contacts (
          id,
          name,
          email
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('clicked', true)
      .order('clicked_at', { ascending: false })

    if (clickedError) {
      console.error('❌ [CAMPAIGN REPORT] Error loading clicked contacts:', clickedError)
    } else {
      console.log('🖱️ [CAMPAIGN REPORT] Contacts who clicked:', clickedData?.length || 0)
    }

    // Get click details (which links were clicked)
    const { data: clicksData, error: clicksError } = await supabase
      .from('campaign_clicks')
      .select('recipient_id, url, clicked_at')
      .eq('campaign_id', campaignId)
      .order('clicked_at', { ascending: false })

    if (clicksError) {
      console.error('❌ [CAMPAIGN REPORT] Error loading click details:', clicksError)
    } else {
      console.log('🔗 [CAMPAIGN REPORT] Total clicks recorded:', clicksData?.length || 0)
    }

    // Transform opened contacts data
    const contactsOpened = (openedData || [])
      .filter((r: any) => r.contacts) // Filter out any null contacts
      .map((r: any) => ({
        contact_id: r.contact_id,
        name: r.contacts.name || 'Unknown',
        email: r.contacts.email || '',
        open_count: r.opened_count || 1,
        click_count: 0, // Will be filled if they also clicked
        first_opened: r.opened_at,
        last_opened: r.opened_at,
        first_clicked: null,
        links_clicked: []
      }))

    // Transform clicked contacts data
    const contactsClicked = (clickedData || [])
      .filter((r: any) => r.contacts) // Filter out any null contacts
      .map((r: any) => {
        // Find all clicks for this contact
        const contactClicks = (clicksData || [])
          .filter((c: any) => {
            // Match by recipient - need to get recipient_id for this contact
            return c.recipient_id === r.contact_id
          })

        const uniqueLinks = [...new Set(contactClicks.map((c: any) => c.url))]
        const firstClick = contactClicks[contactClicks.length - 1] // Last in array is first chronologically

        return {
          contact_id: r.contact_id,
          name: r.contacts.name || 'Unknown',
          email: r.contacts.email || '',
          open_count: 0, // Will be filled if they also opened
          click_count: r.clicked_count || 1,
          first_opened: null,
          last_opened: null,
          first_clicked: firstClick?.clicked_at || r.clicked_at,
          links_clicked: uniqueLinks
        }
      })

    // Merge opened and clicked data for contacts who did both
    // This creates a complete picture of each contact's engagement
    const allContactIds = new Set([
      ...contactsOpened.map(c => c.contact_id),
      ...contactsClicked.map(c => c.contact_id)
    ])

    // Build comprehensive contact engagement data
    const mergedContacts = Array.from(allContactIds).map(contactId => {
      const opened = contactsOpened.find(c => c.contact_id === contactId)
      const clicked = contactsClicked.find(c => c.contact_id === contactId)

      return {
        contact_id: contactId,
        name: opened?.name || clicked?.name || 'Unknown',
        email: opened?.email || clicked?.email || '',
        open_count: opened?.open_count || 0,
        click_count: clicked?.click_count || 0,
        first_opened: opened?.first_opened || null,
        last_opened: opened?.last_opened || null,
        first_clicked: clicked?.first_clicked || null,
        links_clicked: clicked?.links_clicked || []
      }
    })

    // Separate into opened and clicked for display
    const finalOpened = mergedContacts.filter(c => c.open_count > 0)
    const finalClicked = mergedContacts.filter(c => c.click_count > 0)

    // Calculate actual metrics from recipient data (more accurate than stored counts)
    const { data: allRecipients } = await supabase
      .from('campaign_recipients')
      .select('id, opened, clicked')
      .eq('campaign_id', campaignId)

    const actualSentCount = allRecipients?.length || campaign.sent_count || 0
    const actualOpenedCount = finalOpened.length
    const actualClickedCount = finalClicked.length

    console.log('✅ [CAMPAIGN REPORT] Report generated successfully')
    console.log('   - Sent:', actualSentCount)
    console.log('   - Opened:', actualOpenedCount)
    console.log('   - Clicked:', actualClickedCount)

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        sent_at: campaign.sent_date,
        sent_count: actualSentCount,
        opened_count: actualOpenedCount,
        clicked_count: actualClickedCount
      },
      contactsOpened: finalOpened,
      contactsClicked: finalClicked
    })

  } catch (error) {
    console.error('❌ [CAMPAIGN REPORT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to load report', details: (error as Error).message },
      { status: 500 }
    )
  }
}
