import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CampaignActivityLogger } from '@/lib/campaign-activity-logger'

// 1x1 transparent pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Use service role client to bypass RLS (tracking pixels have no user session)
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

    console.log('👁️ [OPEN TRACK] Open tracking request:', { campaignId, recipientId })

    if (campaignId && recipientId) {
      console.log('✅ [OPEN TRACK] Valid tracking parameters, processing...')
      const supabase = getServiceClient()
      
      // Get current recipient data (including contact_id for activity logging)
      const { data: recipient } = await supabase
        .from('campaign_recipients')
        .select('opened, opened_count, contact_id, campaign_id')
        .eq('id', recipientId)
        .single()
      
      if (recipient) {
        // Update open status
        await supabase
          .from('campaign_recipients')
          .update({
            opened: true,
            opened_at: recipient.opened ? undefined : new Date().toISOString(),
            opened_count: (recipient.opened_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipientId)
        
        // Update campaign metrics directly (fallback if RPC fails)
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
            await CampaignActivityLogger.logEmailOpen(
              recipient.contact_id,
              campaignId,
              campaign.name,
              campaign.user_id
            )
          }
        } catch (activityError) {
          console.error('Failed to log email open activity:', activityError)
          // Don't fail the tracking pixel if activity logging fails
        }
      }
    }

    // Return tracking pixel
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error tracking email open:', error)
    
    // Still return pixel even on error
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store'
      }
    })
  }
}