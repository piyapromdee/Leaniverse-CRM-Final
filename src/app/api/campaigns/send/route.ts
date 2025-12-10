import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

// Track pixel for open tracking
const getTrackingPixel = (campaignId: string, recipientId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `<img src="${baseUrl}/api/campaigns/track/open?cid=${campaignId}&rid=${recipientId}" width="1" height="1" style="display:none;" />`
}

// Wrap links for click tracking
const wrapLinksForTracking = (html: string, campaignId: string, recipientId: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  
  return html.replace(linkRegex, (match, url) => {
    if (url.includes('unsubscribe') || url.includes('/api/campaigns/track/')) {
      return match
    }
    const trackedUrl = `${baseUrl}/api/campaigns/track/click?cid=${campaignId}&rid=${recipientId}&url=${encodeURIComponent(url)}`
    return match.replace(url, trackedUrl)
  })
}

// Replace template variables
const replaceTemplateVariables = (content: string, variables: Record<string, any>): string => {
  let processedContent = content
  
  // Replace variables
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
    processedContent = processedContent.replace(regex, variables[key] || '')
  })
  
  // Remove any remaining unreplaced variables
  processedContent = processedContent.replace(/{{[^}]+}}/g, '')
  
  // Update logo URL to use absolute path
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  processedContent = processedContent.replace(
    /src="\/dummi-co-logo\.png"/g,
    `src="${baseUrl}/dummi-co-logo.png"`
  )
  
  // Also replace placeholder logo URLs
  processedContent = processedContent.replace(
    /https:\/\/yourdomain\.com\/dummi-co-logo\.png/g,
    `${baseUrl}/dummi-co-logo.png`
  )
  
  return processedContent
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId, isAutomation = false, recipientId = null } = await request.json()
    
    console.log('📨 [CAMPAIGN SEND] Request received:', {
      campaignId,
      isAutomation,
      recipientId
    })
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }
    
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    
    if (!user || !pass) {
      return NextResponse.json(
        { error: 'Gmail credentials not configured' },
        { status: 500 }
      )
    }
    
    const supabase = await createClient()
    
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Get recipients - either specific recipient for automation or all pending recipients
    let recipientsQuery = supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
    
    if (recipientId) {
      // For automation - send to specific recipient
      recipientsQuery = recipientsQuery.eq('id', recipientId)
    } else {
      // For bulk sends - send to all pending recipients
      recipientsQuery = recipientsQuery.eq('status', 'pending')
    }
    
    let { data: recipients, error: recipientsError } = await recipientsQuery
    
    console.log('📨 [CAMPAIGN SEND] Recipients query result:', {
      recipientCount: recipients?.length || 0,
      recipients: recipients?.map(r => ({ id: r.id, email: r.email, status: r.status }))
    })
    
    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json(
        { error: 'Failed to fetch recipients', details: recipientsError.message },
        { status: 500 }
      )
    }
    
    // Handle no recipients found
    if (!recipients || recipients.length === 0) {
      if (recipientId) {
        // For automation - specific recipient not found
        return NextResponse.json(
          { error: `Recipient ${recipientId} not found for this campaign.` },
          { status: 404 }
        )
      } else {
        // For bulk sends - check if there are any recipients at all
        const { data: allRecipients, count } = await supabase
          .from('campaign_recipients')
          .select('*', { count: 'exact' })
          .eq('campaign_id', campaignId)
        
        if (count && count > 0) {
          // Recipients exist but already sent
          return NextResponse.json(
            { error: `Campaign already sent to ${count} recipients. Create a new campaign to send again.` },
            { status: 400 }
          )
        } else {
          // No recipients at all
          return NextResponse.json(
            { error: 'No recipients found for this campaign. Please select recipients first.' },
            { status: 400 }
          )
        }
      }
    }
    
    // Update campaign status to sending (only for bulk sends, not automation)
    if (!isAutomation) {
      await supabase
        .from('campaigns')
        .update({ 
          status: 'sending',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })
    
    let sent = 0
    let failed = 0
    
    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Replace template variables
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const personalizedHtml = replaceTemplateVariables(campaign.content, {
          first_name: recipient.first_name || 'there',
          last_name: recipient.last_name || '',
          full_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'there',
          email: recipient.email,
          link: campaign.metadata?.link || 'https://www.example.com', // Default link if not provided
          website: 'https://www.example.com', // Company website
          unsubscribe_link: `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`
        })
        
        const personalizedSubject = replaceTemplateVariables(campaign.subject, {
          first_name: recipient.first_name || 'there'
        })
        
        // Add tracking
        let finalHtml = personalizedHtml
        finalHtml += getTrackingPixel(campaignId, recipient.id)
        finalHtml = wrapLinksForTracking(finalHtml, campaignId, recipient.id)
        
        // Send email with company branding
        await transporter.sendMail({
          from: `"Dummi & Co" <${campaign.from_email || user}>`,
          to: recipient.email,
          subject: personalizedSubject,
          html: finalHtml,
          replyTo: campaign.reply_to_email || user
        })
        
        // Update recipient status
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', recipient.id)
        
        sent++
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error)
        
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'failed',
            bounce_reason: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', recipient.id)
        
        failed++
      }
    }
    
    // Update campaign status and metrics
    console.log(`📊 [CAMPAIGN SEND] Updating campaign metrics - Sent: ${sent}, Failed: ${failed}`)

    // IMPORTANT: Call RPC first to update opened/clicked counts
    // Then update sent_count separately so RPC doesn't overwrite it
    console.log('🔄 [CAMPAIGN SEND] Calling update_campaign_metrics RPC first...')
    try {
      await supabase.rpc('update_campaign_metrics', {
        campaign_id_param: campaignId
      })
      console.log('✅ [CAMPAIGN SEND] RPC executed successfully')
    } catch (rpcError) {
      console.log('⚠️  [CAMPAIGN SEND] RPC failed (may not exist):', rpcError)
    }

    if (isAutomation) {
      // For automation sends - increment the sent count
      const { data: currentCampaign } = await supabase
        .from('campaigns')
        .select('sent_count')
        .eq('id', campaignId)
        .single()

      const currentSentCount = currentCampaign?.sent_count || 0

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          sent_count: currentSentCount + sent,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)

      if (updateError) {
        console.error('❌ [CAMPAIGN SEND] Failed to update automation campaign metrics:', updateError)
      } else {
        console.log(`✅ [CAMPAIGN SEND] Updated automation campaign sent_count: ${currentSentCount} -> ${currentSentCount + sent}`)
      }
    } else {
      // For bulk sends - set the sent count and update status
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          status: 'sent',
          sent_date: new Date().toISOString(),
          sent_count: sent,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)

      if (updateError) {
        console.error('❌ [CAMPAIGN SEND] Failed to update campaign metrics:', updateError)
      } else {
        console.log(`✅ [CAMPAIGN SEND] Updated campaign sent_count to: ${sent}`)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      sent, 
      failed 
    })
    
  } catch (error) {
    console.error('Error sending campaign:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}