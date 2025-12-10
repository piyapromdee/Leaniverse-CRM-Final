import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { campaignId, status } = await request.json()
    
    if (!campaignId || !status) {
      return NextResponse.json(
        { error: 'Campaign ID and status are required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Update campaign status
    const { data, error } = await supabase
      .from('campaigns')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating campaign status:', error)
      return NextResponse.json(
        { error: 'Failed to update campaign status', details: error.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Campaign status updated:', {
      id: campaignId,
      name: data.name,
      old_status: data.status,
      new_status: status
    })
    
    return NextResponse.json({ 
      success: true,
      campaign: data
    })
    
  } catch (error) {
    console.error('Error in fix-status API:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}