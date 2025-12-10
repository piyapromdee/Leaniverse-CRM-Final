// API endpoint for converting leads to deals
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger, ACTIVITY_TYPES } from '@/lib/activity-logger'

// POST /api/leads/convert - Convert a qualified lead to a deal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { lead_id } = body

    if (!lead_id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    // Get the lead details with org_id
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    // Check if lead is qualified
    if (lead.status !== 'qualified') {
      return NextResponse.json({ 
        error: 'Only qualified leads can be converted to deals' 
      }, { status: 400 })
    }

    // Helper function to get human-readable channel name from lead source
    const getChannelName = (source: string): string => {
      if (!source) return 'Unknown';
      
      // If it's a lead magnet ID (contains dashes and numbers), map to "Lead Magnet"
      if (source.includes('deemmi-lead-form') || source.includes('-copy-') || /^\w+-\w+-\w+-\d+$/.test(source)) {
        return 'Lead Magnet';
      }
      
      // Map common sources to proper names
      const sourceMap: { [key: string]: string } = {
        'Lead Website': 'Website',
        'lead website': 'Website',
        'website': 'Website',
        'organic search': 'Organic Search',
        'social media': 'Social Media',
        'email marketing': 'Email Marketing',
        'cold call': 'Cold Call',
        'referral': 'Referral',
        'linkedin': 'LinkedIn',
        'advertising': 'Advertising',
        'partner': 'Partner'
      };
      
      const lowerSource = source.toLowerCase();
      return sourceMap[lowerSource] || source; // Return mapped name or original if not found
    };

    // Create company record if company name exists
    let companyId = null;
    if (lead.company_name) {
      console.log('Creating company:', lead.company_name)
      
      // Check if company already exists first
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', lead.company_name)
        .eq('user_id', user.id)
        .single()
      
      if (existingCompany) {
        companyId = existingCompany.id
        console.log('Using existing company with ID:', companyId)
      } else {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([{
            name: lead.company_name,
            user_id: user.id,
            org_id: lead.org_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()
        
        if (company && !companyError) {
          companyId = company.id
          console.log('Company created with ID:', companyId)
        } else {
          console.warn('Failed to create company:', companyError)
        }
      }
    }

    // Create contact record from lead information
    let contactId = null;
    if (lead.first_name || lead.last_name || lead.email) {
      const contactName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email;
      console.log('Creating contact:', contactName)
      
      // Check if contact already exists first (by email or name+company)
      let existingContact = null;
      if (lead.email) {
        const { data } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', lead.email)
          .eq('user_id', user.id)
          .single()
        existingContact = data;
      }
      
      if (existingContact) {
        contactId = existingContact.id
        console.log('Using existing contact with ID:', contactId)
      } else {
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .insert([{
            name: contactName,
            email: lead.email,
            phone: lead.phone,
            company_id: companyId,
            user_id: user.id,
            org_id: lead.org_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()
        
        if (contact && !contactError) {
          contactId = contact.id
          console.log('Contact created with ID:', contactId)
        } else {
          console.warn('Failed to create contact:', contactError)
        }
      }
    }

    // Create the deal from lead data using correct schema
    // Map lead priority to valid deal priority values
    const dealPriority = (() => {
      switch(lead.priority?.toLowerCase()) {
        case 'urgent': return 'high';
        case 'high': return 'high';
        case 'medium': return 'medium';
        case 'low': return 'low';
        default: return 'medium';
      }
    })();
    
    const dealData = {
      user_id: user.id,
      org_id: lead.org_id, // Preserve org_id
      title: `${lead.company_name || 'Deal'} - ${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      description: lead.notes ? `Converted from lead. Original notes: ${lead.notes}` : 'Converted from qualified lead.',
      
      // Deal specifics
      stage: 'discovery', // Start converted leads in discovery stage
      value: lead.value || 0, // Use lead's expected value, default to 0 if not set
      priority: dealPriority,
      
      // Lead source tracking  
      channel: getChannelName(lead.source), // Map lead source to proper channel name
      
      // Timeline - set close date 30 days from now as default
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // References to created company and contact
      company_id: companyId,
      contact_id: contactId,
      
      // CRITICAL: Map lead's assigned_to to deal's assigned_to (preserve owner)
      assigned_to: lead.assigned_to || user.id // Use lead owner, fallback to current user
    }

    // Insert the deal
    console.log('Creating deal with data:', dealData)
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert([dealData])
      .select()
      .single()

    if (dealError) {
      console.error('Error creating deal:', dealError)
      return NextResponse.json({ error: 'Failed to create deal from lead', details: dealError.message }, { status: 500 })
    }

    console.log('Deal created successfully:', deal)

    // Update lead status to converted
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        status: 'converted'
        // Note: converted_at and converted_to_deal_id columns would need to be added to leads table
        // For now just update the status
      })
      .eq('id', lead_id)

    if (updateError) {
      console.error('Error updating lead status:', updateError)
      // Don't fail the conversion if we can't update the lead
    }

    // Log activities for both lead conversion and deal creation
    try {
      const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || 'Lead'
      
      // Log lead conversion
      await ActivityLogger.leadConverted(
        lead.id,
        leadName,
        {
          deal_id: deal.id,
          deal_title: deal.title,
          deal_value: deal.value,
          user_id: user.id
        }
      )
      
      // Log deal creation
      await ActivityLogger.dealCreated(
        deal.id,
        deal.title,
        {
          source: 'lead_conversion',
          lead_id: lead.id,
          lead_name: leadName,
          channel: deal.channel,
          value: deal.value,
          user_id: user.id
        }
      )
    } catch (activityError) {
      console.warn('Failed to create activity records:', activityError)
    }

    return NextResponse.json({ 
      success: true, 
      deal,
      lead_id: lead.id,
      message: 'Lead successfully converted to deal' 
    })

  } catch (error) {
    console.error('Error in POST /api/leads/convert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}