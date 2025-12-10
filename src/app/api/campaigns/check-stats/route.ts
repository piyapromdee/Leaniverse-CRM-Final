import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get Welcome Test1 campaign stats
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, name, status, sent_count, recipient_count, opened_count, clicked_count')
      .eq('id', '252d6f35-6480-4343-ace7-5b1ab7435696')
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Get actual recipient count
    const { count: actualRecipientCount } = await supabase
      .from('campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', '252d6f35-6480-4343-ace7-5b1ab7435696')
    
    // Get sent recipient count
    const { count: sentRecipientCount } = await supabase
      .from('campaign_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', '252d6f35-6480-4343-ace7-5b1ab7435696')
      .eq('status', 'sent')
    
    return NextResponse.json({
      campaign,
      actual_recipient_count: actualRecipientCount,
      sent_recipient_count: sentRecipientCount,
      summary: {
        name: campaign?.name,
        status: campaign?.status,
        sent_count: campaign?.sent_count,
        db_recipient_count: campaign?.recipient_count,
        actual_total_recipients: actualRecipientCount,
        actual_sent_recipients: sentRecipientCount
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check campaign stats' },
      { status: 500 }
    )
  }
}