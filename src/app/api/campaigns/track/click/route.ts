import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CampaignActivityLogger } from '@/lib/campaign-activity-logger'

// Use service role client to bypass RLS (tracking links have no user session)
const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('cid')
    const recipientId = searchParams.get('rid')
    const targetUrl = searchParams.get('url')

    console.log('🖱️ [CLICK TRACK] Click tracking request:', { campaignId, recipientId, targetUrl })

    if (!targetUrl) {
      console.log('❌ [CLICK TRACK] No target URL provided')
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (campaignId && recipientId) {
      console.log('✅ [CLICK TRACK] Valid tracking parameters, processing...')
      const supabase = getServiceClient()
      
      // Get current recipient data (including contact_id for activity logging)
      const { data: recipient, error: recipientError } = await supabase
        .from('campaign_recipients')
        .select('opened, opened_count, clicked, clicked_count, contact_id, campaign_id')
        .eq('id', recipientId)
        .single()

      console.log('📊 [CLICK TRACK] Recipient query result:', { recipient, recipientError })

      if (recipient) {
        console.log('✅ [CLICK TRACK] Recipient found, updating...')
        // Update both click and open status (clicking implies opening)
        const { error: updateError } = await supabase
          .from('campaign_recipients')
          .update({
            // Mark as opened if not already opened
            opened: true,
            opened_at: recipient.opened ? undefined : new Date().toISOString(),
            opened_count: recipient.opened ? recipient.opened_count : (recipient.opened_count || 0) + 1,
            // Mark as clicked
            clicked: true,
            clicked_at: recipient.clicked ? undefined : new Date().toISOString(),
            clicked_count: (recipient.clicked_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipientId)

        if (updateError) {
          console.error('❌ [CLICK TRACK] Failed to update recipient:', updateError)
        } else {
          console.log('✅ [CLICK TRACK] Recipient updated successfully')
        }
        
        // Record the click
        const { error: clickInsertError } = await supabase
          .from('campaign_clicks')
          .insert({
            campaign_id: campaignId,
            recipient_id: recipientId,
            url: targetUrl,
            user_agent: request.headers.get('user-agent'),
            clicked_at: new Date().toISOString()
          })

        if (clickInsertError) {
          console.error('❌ [CLICK TRACK] Failed to insert click record:', clickInsertError)
        } else {
          console.log('✅ [CLICK TRACK] Click record inserted successfully')
        }
        
        // Update campaign metrics with fallback
        try {
          await supabase.rpc('update_campaign_metrics', { 
            campaign_id_param: campaignId 
          })
        } catch (rpcError) {
          console.log('RPC failed, updating metrics manually:', rpcError)
          
          // Manual metric update as fallback
          const { data: openedCount } = await supabase
            .from('campaign_recipients')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('opened', true)
          
          const { data: clickedCount } = await supabase
            .from('campaign_recipients')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('clicked', true)
          
          await supabase
            .from('campaigns')
            .update({
              opened_count: openedCount?.length || 0,
              clicked_count: clickedCount?.length || 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)
        }

        // Log activity to contact timeline
        try {
          // Get campaign details for activity logging
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('name, user_id')
            .eq('id', campaignId)
            .single()

          if (campaign && recipient.contact_id) {
            // Log both the email open (if first time) and the click
            if (!recipient.opened) {
              await CampaignActivityLogger.logEmailOpen(
                recipient.contact_id,
                campaignId,
                campaign.name,
                campaign.user_id
              )
            }

            // Log the click
            await CampaignActivityLogger.logLinkClick(
              recipient.contact_id,
              campaignId,
              campaign.name,
              targetUrl,
              campaign.user_id
            )
          }
        } catch (activityError) {
          console.error('Failed to log click activity:', activityError)
          // Don't fail the redirect if activity logging fails
        }
      }
    }

    // Redirect to the actual URL
    // targetUrl is already decoded by Next.js from the query param
    // Ensure it's a valid absolute URL
    const redirectUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`
    console.log('🔗 [CLICK TRACK] Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error tracking click:', error)
    
    // Redirect to home on error
    return NextResponse.redirect(new URL('/', request.url))
  }
}