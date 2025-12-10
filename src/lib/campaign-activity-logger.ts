import { createClient } from '@supabase/supabase-js'

// Use service role client to bypass RLS (activity logging happens without user session)
const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Campaign Activity Logger
 *
 * Logs campaign email interactions (opens, clicks) to the activities table
 * so they appear in contact timelines for sales intelligence.
 */
export class CampaignActivityLogger {
  /**
   * Log an email open event to the contact's activity timeline
   *
   * @param contactId - UUID of the contact who opened the email
   * @param campaignId - UUID of the campaign
   * @param campaignName - Name of the campaign for display
   * @param userId - UUID of the user who owns this campaign
   */
  static async logEmailOpen(
    contactId: string,
    campaignId: string,
    campaignName: string,
    userId: string
  ): Promise<void> {
    try {
      const supabase = getServiceClient()

      const activityData = {
        user_id: userId,
        contact_id: contactId,
        action_type: 'email_opened',
        entity_type: 'campaign',
        entity_id: campaignId,
        entity_title: campaignName,
        description: `Opened Email: "${campaignName}"`,
        metadata: {
          campaign_id: campaignId,
          campaign_name: campaignName,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }

      console.log('📧 [CAMPAIGN ACTIVITY] Logging email open:', {
        contactId,
        userId,
        campaignName
      })

      const { error } = await supabase
        .from('activities')
        .insert(activityData)

      if (error) {
        console.error('❌ [CAMPAIGN ACTIVITY] Failed to log email open:', error)
      } else {
        console.log('✅ [CAMPAIGN ACTIVITY] Email open logged successfully')
      }
    } catch (error) {
      console.error('❌ [CAMPAIGN ACTIVITY] Error logging email open:', error)
    }
  }

  /**
   * Log a link click event to the contact's activity timeline
   *
   * @param contactId - UUID of the contact who clicked
   * @param campaignId - UUID of the campaign
   * @param campaignName - Name of the campaign for display
   * @param linkUrl - The URL that was clicked
   * @param userId - UUID of the user who owns this campaign
   */
  static async logLinkClick(
    contactId: string,
    campaignId: string,
    campaignName: string,
    linkUrl: string,
    userId: string
  ): Promise<void> {
    try {
      const supabase = getServiceClient()

      const activityData = {
        user_id: userId,
        contact_id: contactId,
        action_type: 'email_clicked',
        entity_type: 'campaign',
        entity_id: campaignId,
        entity_title: campaignName,
        description: `Clicked Link in: "${campaignName}"`,
        metadata: {
          campaign_id: campaignId,
          campaign_name: campaignName,
          link_url: linkUrl,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }

      console.log('🖱️ [CAMPAIGN ACTIVITY] Logging link click:', {
        contactId,
        userId,
        campaignName,
        linkUrl
      })

      const { error } = await supabase
        .from('activities')
        .insert(activityData)

      if (error) {
        console.error('❌ [CAMPAIGN ACTIVITY] Failed to log link click:', error)
      } else {
        console.log('✅ [CAMPAIGN ACTIVITY] Link click logged successfully')
      }
    } catch (error) {
      console.error('❌ [CAMPAIGN ACTIVITY] Error logging link click:', error)
    }
  }
}
