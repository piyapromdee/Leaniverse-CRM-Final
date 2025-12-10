import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ActivityLogger } from '@/lib/activity-logger'

// Function to automatically enroll a lead in an email campaign
async function enrollLeadInCampaign(
  serviceClient: any,
  campaignId: string,
  lead: any,
  leadMagnetTitle: string
) {
  try {
    console.log('🎯 [CAMPAIGN AUTOMATION] Starting enrollment process...')
    console.log('Campaign ID:', campaignId)
    console.log('Lead:', { id: lead.id, email: lead.email, name: `${lead.first_name} ${lead.last_name}` })

    // First, check if the campaign exists and is active
    const { data: campaign, error: campaignError } = await serviceClient
      .from('campaigns')
      .select('id, name, status, contact_list_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.warn('🚫 [CAMPAIGN AUTOMATION] Campaign not found:', campaignId)
      return
    }

    // Only reject cancelled campaigns - allow draft, scheduled, and sent campaigns for automation
    if (campaign.status === 'cancelled') {
      console.warn(`🚫 [CAMPAIGN AUTOMATION] Cannot enroll in campaign "${campaign.name}"`)
      console.warn(`   Status: ${campaign.status} (cancelled campaigns cannot accept new enrollments)`)
      console.warn(`   Solution: Change campaign status to 'draft' or 'scheduled' or create a new campaign`)
      return
    }

    console.log('✅ [CAMPAIGN AUTOMATION] Campaign found:', campaign.name, `(${campaign.status})`)

    // First, ensure the lead exists as a contact
    let contactId = lead.id
    
    // Check if contact already exists with this email
    const { data: existingContact } = await serviceClient
      .from('contacts')
      .select('id')
      .eq('email', lead.email)
      .single()
    
    if (!existingContact) {
      // Create contact record from lead data
      console.log('📝 [CAMPAIGN AUTOMATION] Creating contact record for lead')
      const { data: newContact, error: contactError } = await serviceClient
        .from('contacts')
        .insert([{
          id: lead.id, // Use same ID as lead for consistency
          email: lead.email,
          name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email, // Contacts use 'name' field
          phone: lead.phone || null,
          company_id: null, // Contacts use company_id, not company
          status: 'customer', // Default status for new contacts
          user_id: lead.user_id, // Include user_id from lead
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (contactError) {
        console.error('❌ [CAMPAIGN AUTOMATION] Failed to create contact:', contactError)
        return
      }
      
      contactId = newContact.id
      console.log('✅ [CAMPAIGN AUTOMATION] Contact created:', contactId)
    } else {
      contactId = existingContact.id
      console.log('🔄 [CAMPAIGN AUTOMATION] Using existing contact:', contactId)
    }

    // Check if contact is already enrolled to prevent duplicates
    const { data: existingRecipient } = await serviceClient
      .from('campaign_recipients')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)
      .single()

    if (existingRecipient) {
      console.log('🔄 [CAMPAIGN AUTOMATION] Contact already enrolled in campaign')
      return
    }

    // Create campaign recipient record
    const recipientData = {
      campaign_id: campaignId,
      contact_id: contactId,
      email: lead.email,
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      status: 'pending'
    }

    const { data: recipient, error: recipientError } = await serviceClient
      .from('campaign_recipients')
      .insert([recipientData])
      .select()
      .single()

    if (recipientError) {
      console.error('❌ [CAMPAIGN AUTOMATION] Failed to create recipient:', recipientError)
      return
    }

    console.log('✅ [CAMPAIGN AUTOMATION] Successfully enrolled lead in campaign')

    // Update campaign recipient count
    const { error: updateError } = await serviceClient.rpc('update_campaign_metrics', {
      campaign_id_param: campaignId
    })

    if (updateError) {
      console.warn('⚠️ [CAMPAIGN AUTOMATION] Failed to update campaign metrics:', updateError)
    }

    // Send the campaign email immediately for scheduled campaigns
    if (campaign.status === 'scheduled' || campaign.status === 'draft' || campaign.status === 'sent') {
      try {
        console.log('📧 [CAMPAIGN AUTOMATION] Triggering campaign send for new recipient')
        console.log('   Campaign Status:', campaign.status)
        console.log('   Campaign ID:', campaignId)
        console.log('   Recipient ID:', recipient.id)
        
        // Trigger the campaign send for this specific enrollment
        // We'll send to just this recipient by updating their status
        await serviceClient
          .from('campaign_recipients')
          .update({ 
            status: 'pending', // Mark as ready to send
            updated_at: new Date().toISOString()
          })
          .eq('id', recipient.id)
        
        // Call the existing campaign send API to process this recipient
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
        const sendResponse = await fetch(`${baseUrl}/api/campaigns/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: campaignId,
            recipientId: recipient.id, // Send to specific recipient only
            isAutomation: true // Mark this as an automation send to preserve campaign status
          })
        })

        if (sendResponse.ok) {
          const result = await sendResponse.json()
          console.log('✅ [CAMPAIGN AUTOMATION] Campaign send triggered:', result)
          
          // Don't manually update stats here - the campaign send API already handles this
          // Just update the recipient count since we added a new recipient
          const { data: currentCampaign } = await serviceClient
            .from('campaigns')
            .select('recipient_count')
            .eq('id', campaignId)
            .single()
          
          await serviceClient
            .from('campaigns')
            .update({
              recipient_count: (currentCampaign?.recipient_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaignId)
          
          console.log('✅ [CAMPAIGN AUTOMATION] Campaign recipient count updated')
        } else {
          const errorText = await sendResponse.text()
          console.warn('⚠️ [CAMPAIGN AUTOMATION] Campaign send failed:', errorText)
        }
      } catch (emailError) {
        console.warn('⚠️ [CAMPAIGN AUTOMATION] Email sending failed (non-critical):', emailError)
        // Don't fail enrollment if email fails - the lead is still enrolled
      }
    }

    // Also add to contact list if campaign has one
    if (campaign.contact_list_id) {
      try {
        const { error: listError } = await serviceClient
          .from('contact_list_members')
          .upsert([{
            list_id: campaign.contact_list_id,
            contact_id: contactId, // Use the contact ID, not lead ID
            status: 'active'
          }])

        if (!listError) {
          console.log('✅ [CAMPAIGN AUTOMATION] Added to contact list:', campaign.contact_list_id)
          
          // Update contact list count
          await serviceClient.rpc('update_contact_list_count', {
            list_id_param: campaign.contact_list_id
          })
        }
      } catch (listError) {
        console.warn('⚠️ [CAMPAIGN AUTOMATION] Failed to add to contact list:', listError)
      }
    }

    console.log('🎉 [CAMPAIGN AUTOMATION] Lead enrollment completed successfully!')
    console.log(`Lead "${lead.first_name} ${lead.last_name}" enrolled in campaign "${campaign.name}" via lead magnet "${leadMagnetTitle}"`)

  } catch (error) {
    console.error('💥 [CAMPAIGN AUTOMATION] Error during enrollment:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Extract UTM parameters from headers/referrer if available
    const referrer = request.headers.get('referer') || ''
    const userAgent = request.headers.get('user-agent') || ''
    
    // Get IP address (in production, you'd get this from headers)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Parse UTM parameters from referrer URL
    let utm_source = null, utm_medium = null, utm_campaign = null
    try {
      const url = new URL(referrer)
      utm_source = url.searchParams.get('utm_source')
      utm_medium = url.searchParams.get('utm_medium')
      utm_campaign = url.searchParams.get('utm_campaign')
    } catch (e) {
      // Invalid URL, skip UTM parsing
    }

    // Create submission record
    const submissionData = {
      lead_magnet_id: body.lead_magnet_id,
      email: body.email,
      name: body.name,
      company: body.company,
      phone: body.phone,
      form_data: body.form_data || {},
      ip_address: ip,
      user_agent: userAgent,
      referrer: referrer,
      utm_source,
      utm_medium,
      utm_campaign
    }

    // Try to save to database
    const { data: submission, error: submissionError } = await supabase
      .from('lead_magnet_submissions')
      .insert([submissionData])
      .select()
      .single()

    if (submissionError) {
      console.log('Note: Could not save submission (table may not exist):', submissionError.message)
      // Continue anyway for demo purposes
    }

    // Extract email from form data
    console.log('🔍 [DEBUG] Request body structure:', JSON.stringify(body, null, 2))
    console.log('🔍 [DEBUG] Form data keys:', body.form_data ? Object.keys(body.form_data) : 'No form_data')
    console.log('🔍 [DEBUG] Form data values:', body.form_data)
    
    // Extract email from form data - handle both field names and auto-generated IDs
    let emailAddress = body.form_data?.email || body.form_data?.work_email || body.email
    
    // If not found by name, search through all form data values for email pattern
    if (!emailAddress && body.form_data) {
      for (const [key, value] of Object.entries(body.form_data)) {
        if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
          emailAddress = value
          console.log('🔍 [DEBUG] Found email in field:', key, '=', emailAddress)
          break
        }
      }
    }
    
    console.log('🔍 [DEBUG] Final extracted email address:', emailAddress)
    
    // Try to create or update lead record
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', emailAddress)
      .single()

    console.log('🔍 [DEBUG] Existing lead check:', existingLead ? 'FOUND existing lead' : 'No existing lead')
    
    // Use service client to bypass RLS for lead operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    if (!existingLead) {
      // Extract field data from form - handle both field names and auto-generated IDs
      let firstName = body.form_data?.first_name || body.name?.split(' ')[0] || 'Unknown'
      let lastName = body.form_data?.last_name || body.name?.split(' ').slice(1).join(' ') || ''
      let companyName = body.form_data?.company || body.form_data?.company_name || body.company || 'Unknown Company'
      
      // If not found by name, search through form data for likely values
      if (firstName === 'Unknown' && body.form_data) {
        for (const [key, value] of Object.entries(body.form_data)) {
          if (typeof value === 'string' && value && !value.includes('@') && !value.includes('.')) {
            // This is likely a name field if it's text without email characteristics
            firstName = value
            console.log('🔍 [DEBUG] Found name in field:', key, '=', firstName)
            break
          }
        }
      }
      
      // Extract value from custom fields - look for fields that might contain numeric values
      let leadValue = 0
      if (body.form_data) {
        // Look for common value field names and any numeric fields
        const valueFields = ['value', 'values', 'budget', 'amount', 'price', '1756028979197'] // Include specific field ID for "Values"
        for (const fieldName of valueFields) {
          if (body.form_data[fieldName] && !isNaN(body.form_data[fieldName])) {
            leadValue = parseInt(body.form_data[fieldName]) || 0
            break
          }
        }
      }
      
      // Service client already created above
      
      // Find a user to assign the lead to (get any admin/owner user)
      const { data: { users }, error: usersError } = await serviceClient.auth.admin.listUsers()
      let assignUserId = null
      let assignOrgId = null
      
      if (!usersError && users && users.length > 0) {
        // Get the first admin/owner user, or fallback to any user
        const adminUser = users.find(u => u.user_metadata?.role === 'admin' || u.user_metadata?.role === 'owner')
        assignUserId = adminUser?.id || users[0].id
        console.log('Assigning lead to user:', assignUserId)
        
        // Get the user's org_id from profiles table
        const { data: userProfile } = await serviceClient
          .from('profiles')
          .select('org_id')
          .eq('id', assignUserId)
          .single()
          
        assignOrgId = userProfile?.org_id
        console.log('Assigning lead to org:', assignOrgId)
      }

      // Create new lead using actual schema with service client
      const { data: newLead, error: leadError } = await serviceClient
        .from('leads')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          email: emailAddress,
          company_name: companyName,
          phone: body.form_data?.phone || body.phone,
          job_title: body.form_data?.job_title || 'Unknown',
          status: 'new',
          source: body.lead_magnet_slug || 'deemmi-lead-form',
          notes: `Downloaded: ${body.lead_magnet_title || 'Lead Magnet'}`,
          value: leadValue,
          user_id: assignUserId,
          org_id: assignOrgId
        }])
        .select()
        .single()

      if (leadError) {
        console.log('Note: Could not create lead (table may not exist):', leadError.message)
        console.log('Lead error details:', leadError)
      } else {
        console.log('✅ Lead created successfully:', newLead)
        
        // Create notification for new lead from lead magnet
        try {
          const notificationData = {
            user_id: assignUserId,
            type: 'lead_created' as const,
            title: 'New Lead from Lead Magnet',
            message: `${firstName} ${lastName} submitted "${body.lead_magnet_title || 'Lead Magnet'}" form`,
            entity_type: 'lead',
            entity_id: newLead.id,
            metadata: {
              lead_name: `${firstName} ${lastName}`.trim(),
              lead_email: emailAddress,
              lead_magnet: body.lead_magnet_title || 'Lead Magnet',
              source: 'lead_magnet'
            },
            is_read: false,
            created_at: new Date().toISOString()
          }
          
          const { error: notifError } = await serviceClient
            .from('notifications')
            .insert([notificationData])
          
          if (notifError) {
            console.warn('⚠️ Failed to create notification:', notifError)
          } else {
            console.log('🔔 Notification created for new lead')
          }
        } catch (notifError) {
          console.warn('⚠️ Notification creation failed (non-critical):', notifError)
        }
        
        // Log activity for lead creation
        if (newLead) {
          try {
            await ActivityLogger.leadCreated(
              newLead.id,
              `${newLead.first_name} ${newLead.last_name}`,
              { 
                source: newLead.source,
                user_id: assignUserId 
              }
            )
          } catch (activityError) {
            console.warn('Failed to log lead creation activity:', activityError)
          }
        }
        
        if (newLead && submission) {
          // Update submission with lead_id using service client
          await serviceClient
            .from('lead_magnet_submissions')
            .update({ lead_id: newLead.id })
            .eq('id', submission.id)
        }

        // STEP A & B: Check if lead magnet has campaign_id for automatic enrollment
        try {
          const { data: leadMagnet, error: magnetError } = await serviceClient
            .from('lead_magnets')
            .select('campaign_id, title')
            .eq('id', body.lead_magnet_id)
            .single()

          if (!magnetError && leadMagnet && leadMagnet.campaign_id) {
            console.log('🎯 [CAMPAIGN AUTOMATION] Lead magnet has campaign_id:', leadMagnet.campaign_id)
            
            // STEP C: Automatically enroll lead in the campaign
            await enrollLeadInCampaign(
              serviceClient,
              leadMagnet.campaign_id,
              newLead,
              leadMagnet.title
            )
          }
        } catch (campaignError) {
          console.warn('Campaign enrollment failed (non-critical):', campaignError)
          // Don't fail the submission if campaign enrollment fails
        }
      }
    } else {
      console.log('🔄 [EXISTING LEAD] Processing existing lead:', existingLead.id)
      
      // For existing leads, still try campaign enrollment if lead magnet has campaign_id
      try {
        const { data: leadMagnet, error: magnetError } = await serviceClient
          .from('lead_magnets')
          .select('campaign_id, title')
          .eq('id', body.lead_magnet_id)
          .single()

        if (!magnetError && leadMagnet && leadMagnet.campaign_id) {
          console.log('🎯 [CAMPAIGN AUTOMATION] Existing lead - checking campaign enrollment:', leadMagnet.campaign_id)
          
          // Get full lead data for enrollment
          const { data: fullLead, error: leadError } = await serviceClient
            .from('leads')
            .select('*')
            .eq('id', existingLead.id)
            .single()
            
          if (!leadError && fullLead) {
            // STEP C: Automatically enroll existing lead in the campaign
            await enrollLeadInCampaign(
              serviceClient,
              leadMagnet.campaign_id,
              fullLead,
              leadMagnet.title
            )
          }
        } else {
          console.log('🔍 [EXISTING LEAD] No campaign enrollment - no campaign_id or lead magnet not found')
        }
      } catch (campaignError) {
        console.warn('Campaign enrollment failed for existing lead (non-critical):', campaignError)
      }
    }

    // Send success response
    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your interest!' 
    })

  } catch (error) {
    console.error('Error in POST /api/lead-magnets/submit:', error)
    // Still return success for better UX
    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your interest!' 
    })
  }
}