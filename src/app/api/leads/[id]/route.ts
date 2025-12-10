// Individual Lead API endpoints
// NEW FILE - doesn't affect existing APIs

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger, ACTIVITY_TYPES } from '@/lib/activity-logger'

// GET /api/leads/[id] - Fetch a specific lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params

    // Get current user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Fetch lead with role-based access
    let leadQuery = supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
    
    // Multi-tenant: No need for manual filtering, RLS handles org_id automatically
    // RLS policies ensure users only see leads from their organization
    
    const { data: lead, error } = await leadQuery
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      console.error('Error fetching lead:', error)
      return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
    }

    return NextResponse.json({ lead })

  } catch (error) {
    console.error('Error in GET /api/leads/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/leads/[id] - Update a specific lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params
    const body = await request.json()

    // Remove fields that shouldn't be directly updated
    const { id, created_at, updated_at, ...updateData } = body

    // Get current user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Get current lead data before update to track changes
    let currentLeadQuery = supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
    
    // Multi-tenant: RLS handles filtering automatically
    
    const { data: currentLead } = await currentLeadQuery.single()

    // Update the lead with same role-based access pattern
    let updateQuery = supabase
      .from('leads')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
    
    // Multi-tenant: RLS handles filtering automatically
    
    const { data: lead, error } = await updateQuery.select().single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      console.error('Error updating lead:', error)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    // Recalculate lead score if relevant fields changed
    const scoringFields = ['source', 'job_title', 'priority', 'company_name', 'email', 'phone']
    const shouldRecalculateScore = scoringFields.some(field => field in updateData)
    
    if (shouldRecalculateScore) {
      try {
        // Use the same scoring algorithm as creation
        let score = 0
        const updatedLead = { ...lead, ...updateData }
        
        // Source quality scoring
        const sourceScores = {
          'referral': 25,
          'linkedin': 20,
          'website': 15,
          'google_ads': 10,
          'facebook_ads': 8,
          'email_marketing': 5,
          'cold_outreach': 3
        }
        score += sourceScores[updatedLead.source?.toLowerCase() as keyof typeof sourceScores] || 5
        
        // Contact completeness
        if (updatedLead.company_name) score += 10
        if (updatedLead.email && updatedLead.email.trim() !== '') score += 10
        if (updatedLead.phone) score += 10
        
        // Job title importance
        const jobTitle = (updatedLead.job_title || '').toLowerCase()
        if (jobTitle.includes('ceo') || jobTitle.includes('founder') || jobTitle.includes('owner')) {
          score += 25
        } else if (jobTitle.includes('director') || jobTitle.includes('manager') || jobTitle.includes('head of')) {
          score += 15
        } else if (jobTitle.includes('senior') || jobTitle.includes('lead')) {
          score += 10
        } else if (jobTitle.includes('coordinator') || jobTitle.includes('assistant')) {
          score += 5
        } else if (jobTitle.trim()) {
          score += 8
        }
        
        // Priority multiplier
        const priorityBonus = {
          'urgent': 20,
          'high': 15,
          'medium': 10,
          'low': 5
        }
        score += priorityBonus[updatedLead.priority as keyof typeof priorityBonus] || 10
        
        // Cap at 100
        score = Math.min(score, 100)
        
        // Update the score
        await supabase
          .from('leads')
          .update({ score })
          .eq('id', leadId)
        
        console.log(`Recalculated score for lead ${leadId}: ${score}`)
      } catch (scoreError) {
        console.warn('Failed to recalculate lead score:', scoreError)
      }
    }

    // Log lead update activity
    const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company_name || 'Lead'
    
    if (updateData.status && currentLead) {
      // Status change activity with proper from/to status tracking
      await ActivityLogger.leadStatusChanged(
        leadId,
        leadName,
        currentLead.status || 'new',
        updateData.status,
        { user_id: user.id }
      )
    } else {
      // General update activity
      await ActivityLogger.leadUpdated(
        leadId,
        leadName,
        {
          updated_fields: Object.keys(updateData),
          changes: updateData,
          user_id: user.id
        }
      )
    }

    return NextResponse.json({ 
      success: true, 
      lead,
      message: 'Lead updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/leads/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/leads/[id] - Delete a specific lead (Admin Only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin - only admins can delete leads
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
      return NextResponse.json({ 
        error: 'Forbidden: Only administrators can delete leads' 
      }, { status: 403 })
    }

    const { id: leadId } = await params

    // Use service client to delete any lead (admin operation)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get lead info for activity logging before deletion
    const { data: leadToDelete } = await serviceClient
      .from('leads')
      .select('first_name, last_name, company_name, user_id')
      .eq('id', leadId)
      .single()
    
    console.log(`🗑️ Deleting lead: ${leadId}`)
    
    // Delete the lead using service client (bypass RLS)
    const { error } = await serviceClient
      .from('leads')
      .delete()
      .eq('id', leadId)
    
    // Log deletion activity
    if (!error && leadToDelete) {
      const leadName = `${leadToDelete.first_name || ''} ${leadToDelete.last_name || ''}`.trim() || leadToDelete.company_name || 'Lead'
      await ActivityLogger.leadDeleted(
        leadId,
        leadName,
        { 
          deletion_reason: 'Manual deletion',
          user_id: user.id
        }
      )
    }

    if (error) {
      console.error('Error deleting lead:', error)
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Lead deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}