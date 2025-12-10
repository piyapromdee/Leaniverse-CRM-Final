// Lead to Deal Conversion API
// NEW FILE - doesn't affect existing APIs

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/leads/[id]/convert - Convert a lead to a deal
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = id
    const body = await request.json()

    // Get the lead first with org_id
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (lead.status === 'converted') {
      return NextResponse.json({ error: 'Lead is already converted' }, { status: 400 })
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

    // Check if contact exists, if not create one
    let contactId = null
    
    if (lead.email) {
      // Check for existing contact with this email
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', lead.email)
        .eq('user_id', user.id)
        .single()

      if (existingContact) {
        contactId = existingContact.id
      } else {
        // Create new contact from lead data
        const contactData = {
          user_id: user.id,
          org_id: lead.org_id, // Preserve org_id from lead
          name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email,
          email: lead.email,
          phone: lead.phone,
          job_title: lead.job_title,
          status: 'active',
          source: lead.source,
          notes: lead.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert([contactData])
          .select()
          .single()

        if (contactError) {
          console.error('Error creating contact:', contactError)
          return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
        }

        contactId = newContact.id
      }
    }

    // Check if company exists, if not create one
    let companyId = null
    
    if (lead.company_name) {
      // Check for existing company with this name
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', lead.company_name)
        .eq('user_id', user.id)
        .single()

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        // Create new company from lead data
        const companyData = {
          user_id: user.id,
          org_id: lead.org_id, // Preserve org_id from lead
          name: lead.company_name,
          industry: lead.industry,
          company_size: lead.company_size,
          annual_revenue: lead.annual_revenue,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([companyData])
          .select()
          .single()

        if (companyError) {
          console.error('Error creating company:', companyError)
          return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
        }

        companyId = newCompany.id
      }
    }

    // Create the deal
    const dealData = {
      user_id: user.id,
      org_id: lead.org_id, // Preserve org_id from lead
      title: body.deal_title || `Deal with ${lead.company_name || lead.first_name || lead.email}`,
      description: body.deal_description || `Converted from lead: ${lead.notes || ''}`,
      value: body.deal_value || parseFloat(lead.budget_range?.replace(/[^\d.]/g, '') || '0') || lead.value || 0,
      stage: body.deal_stage || 'discovery', // Use discovery as default stage
      priority: lead.priority || 'medium',
      close_date: body.expected_close_date || null,
      expected_close_date: body.expected_close_date || null,
      contact_id: contactId,
      company_id: companyId,
      assigned_to: lead.assigned_to || user.id, // CRITICAL: Preserve lead owner
      channel: getChannelName(lead.source) || 'Lead Conversion', // Map lead source to proper channel name
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert([dealData])
      .select(`
        *,
        companies(id, name),
        contacts(id, name, email)
      `)
      .single()

    if (dealError) {
      console.error('Error creating deal:', dealError)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    // Update the lead status to converted
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_to_deal_id: deal.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead status:', updateError)
      // Don't fail the conversion if we can't update the lead
    }

    // Create activity records
    await Promise.all([
      // Lead activity
      supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          user_id: user.id,
          activity_type: 'converted',
          title: 'Lead Converted to Deal',
          description: `Lead was successfully converted to deal: ${deal.title}`,
          metadata: {
            deal_id: deal.id,
            deal_title: deal.title,
            deal_value: deal.value
          }
        }]),
      
      // Deal activity (if you have a deals activity table)
      // You can uncomment this if you add activity tracking to deals
      /*
      supabase
        .from('deal_activities')
        .insert([{
          deal_id: deal.id,
          user_id: user.id,
          activity_type: 'created_from_lead',
          title: 'Deal Created from Lead',
          description: `Deal was created by converting lead: ${lead.email}`,
          metadata: {
            lead_id: leadId,
            lead_email: lead.email,
            lead_source: lead.source
          }
        }])
      */
    ])

    return NextResponse.json({
      success: true,
      deal,
      contact_id: contactId,
      company_id: companyId,
      message: 'Lead converted to deal successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/leads/[id]/convert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}