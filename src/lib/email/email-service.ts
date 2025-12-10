// Email Service using Nodemailer with Gmail
// This handles all email sending functionality for campaigns

import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/client'

// Email configuration type
interface EmailConfig {
  from: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  campaignId?: string
  recipientId?: string
}

// Track pixel for open tracking
const getTrackingPixel = (campaignId: string, recipientId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `<img src="${baseUrl}/api/campaigns/track/open?cid=${campaignId}&rid=${recipientId}" width="1" height="1" style="display:none;" />`
}

// Wrap links for click tracking
const wrapLinksForTracking = (html: string, campaignId: string, recipientId: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Regular expression to find all href links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  
  return html.replace(linkRegex, (match, url) => {
    // Don't track unsubscribe links or already tracked links
    if (url.includes('unsubscribe') || url.includes('/api/campaigns/track/')) {
      return match
    }
    
    // Create tracked URL
    const trackedUrl = `${baseUrl}/api/campaigns/track/click?cid=${campaignId}&rid=${recipientId}&url=${encodeURIComponent(url)}`
    
    return match.replace(url, trackedUrl)
  })
}

// Replace template variables like {{first_name}}, {{company}}, etc.
const replaceTemplateVariables = (content: string, variables: Record<string, any>): string => {
  let processedContent = content
  
  // Replace all {{variable}} patterns
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
    processedContent = processedContent.replace(regex, variables[key] || '')
  })
  
  // Replace any remaining unmatched variables with empty string
  processedContent = processedContent.replace(/{{[^}]+}}/g, '')
  
  return processedContent
}

// Create Gmail transporter
const createTransporter = () => {
  // For Gmail, we need app-specific password, not regular password
  // User needs to:
  // 1. Enable 2-factor authentication in Google Account
  // 2. Generate app-specific password at https://myaccount.google.com/apppasswords
  
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  
  if (!user || !pass) {
    throw new Error('Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.')
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    },
    // Gmail sending limits: 500 emails/day for regular accounts
    // 2000 emails/day for Google Workspace accounts
  })
}

// Main email sending function
export const sendEmail = async (config: EmailConfig): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    
    // Add tracking if campaign email
    let finalHtml = config.html
    if (config.campaignId && config.recipientId) {
      // Add tracking pixel for opens
      finalHtml += getTrackingPixel(config.campaignId, config.recipientId)
      
      // Wrap links for click tracking
      finalHtml = wrapLinksForTracking(finalHtml, config.campaignId, config.recipientId)
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: config.from || process.env.GMAIL_USER,
      to: config.to,
      subject: config.subject,
      html: finalHtml,
      text: config.text || '', // Plain text version
      replyTo: config.replyTo
    })
    
    console.log('📧 Email sent:', info.messageId)
    
    // Update campaign recipient status if campaign email
    if (config.campaignId && config.recipientId) {
      const supabase = createClient()
      await supabase
        .from('campaign_recipients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', config.recipientId)
    }
    
    return true
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    
    // Log error to campaign recipient if campaign email
    if (config.campaignId && config.recipientId) {
      const supabase = createClient()
      await supabase
        .from('campaign_recipients')
        .update({
          status: 'failed',
          bounce_reason: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', config.recipientId)
    }
    
    return false
  }
}

// Send campaign emails to a list
export const sendCampaignEmails = async (
  campaignId: string,
  recipients: Array<{
    id: string
    email: string
    first_name?: string
    last_name?: string
    company?: string
  }>,
  emailContent: {
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
  }
): Promise<{ sent: number; failed: number }> => {
  let sent = 0
  let failed = 0
  
  const supabase = createClient()
  
  // Update campaign status to sending
  await supabase
    .from('campaigns')
    .update({ 
      status: 'sending',
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
  
  // Send to each recipient
  for (const recipient of recipients) {
    // Replace template variables
    const personalizedHtml = replaceTemplateVariables(emailContent.html, {
      first_name: recipient.first_name || 'there',
      last_name: recipient.last_name || '',
      full_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'there',
      company: recipient.company || '',
      email: recipient.email
    })
    
    const personalizedSubject = replaceTemplateVariables(emailContent.subject, {
      first_name: recipient.first_name || 'there',
      company: recipient.company || ''
    })
    
    // Send email
    const success = await sendEmail({
      to: recipient.email,
      subject: personalizedSubject,
      html: personalizedHtml,
      text: emailContent.text,
      from: emailContent.from || process.env.GMAIL_USER || 'dummiandco@gmail.com',
      replyTo: emailContent.replyTo,
      campaignId,
      recipientId: recipient.id
    })
    
    if (success) {
      sent++
    } else {
      failed++
    }
    
    // Add small delay to avoid rate limiting (Gmail: max 20 emails/second)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Update campaign metrics
  await supabase
    .from('campaigns')
    .update({
      status: 'sent',
      sent_date: new Date().toISOString(),
      sent_count: sent,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
  
  // Call the update metrics function
  await supabase.rpc('update_campaign_metrics', { campaign_id_param: campaignId })
  
  return { sent, failed }
}

// Test email sending (for debugging)
export const sendTestEmail = async (to: string): Promise<boolean> => {
  return sendEmail({
    from: process.env.GMAIL_USER || 'dummiandco@gmail.com',
    to,
    subject: 'Test Email from CRM Campaign System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Test Email Successful! 🎉</h2>
        <p>Your email configuration is working correctly.</p>
        <p>You can now send campaigns to your contacts.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is a test email from your CRM Campaign System.
        </p>
      </div>
    `,
    text: 'Test Email Successful! Your email configuration is working correctly.'
  })
}

// Process email queue (can be called by cron job or API endpoint)
export const processEmailQueue = async (limit: number = 10): Promise<void> => {
  const supabase = createClient()
  
  // Get pending emails from queue
  const { data: queueItems, error } = await supabase
    .from('email_queue')
    .select(`
      *,
      campaigns (
        subject,
        content,
        from_name,
        from_email,
        reply_to_email
      ),
      campaign_recipients (
        email,
        first_name,
        last_name
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('scheduled_for', { ascending: true })
    .limit(limit)
  
  if (error || !queueItems) {
    console.error('Error fetching email queue:', error)
    return
  }
  
  // Process each queued email
  for (const item of queueItems) {
    // Update status to processing
    await supabase
      .from('email_queue')
      .update({ status: 'processing' })
      .eq('id', item.id)
    
    // Send the email
    const success = await sendEmail({
      to: item.campaign_recipients.email,
      subject: item.campaigns.subject,
      html: item.campaigns.content,
      from: item.campaigns.from_email,
      replyTo: item.campaigns.reply_to_email,
      campaignId: item.campaign_id,
      recipientId: item.recipient_id
    })
    
    // Update queue status
    if (success) {
      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id)
    } else {
      // Retry logic
      if (item.attempts < item.max_attempts) {
        await supabase
          .from('email_queue')
          .update({
            status: 'retry',
            attempts: item.attempts + 1,
            scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Retry in 5 minutes
          })
          .eq('id', item.id)
      } else {
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            last_error: 'Max retry attempts reached'
          })
          .eq('id', item.id)
      }
    }
  }
}