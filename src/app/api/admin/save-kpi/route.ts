import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { member_id, kpiConfig, timePeriod } = body

    console.log('🔧 [API] Saving KPI config:', { member_id, kpiConfig, timePeriod })

    // First, check current profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', member_id)
      .single()

    if (fetchError) {
      console.error('❌ [API] Error fetching profile:', fetchError)
      return NextResponse.json({
        error: 'Failed to fetch profile',
        details: fetchError.message
      }, { status: 500 })
    }

    console.log('📋 [API] Current profile:', currentProfile)
    console.log('📋 [API] Available columns:', Object.keys(currentProfile || {}))

    // Prepare KPI metrics JSONB object (for additional KPI data)
    const kpiMetrics = {
      calls_target: kpiConfig.calls_target,
      meetings_target: kpiConfig.meetings_target,
      conversion_target: kpiConfig.conversion_target,
      time_period: timePeriod,
      updated_at: new Date().toISOString()
    }

    console.log('💾 [API] Updating profile with:', {
      commission_rate: kpiConfig.commission_rate,
      monthly_target: kpiConfig.monthly_target,
      kpi_metrics: kpiMetrics
    })

    // Update profile with both direct columns AND kpi_metrics JSONB
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        commission_rate: kpiConfig.commission_rate,
        monthly_target: kpiConfig.monthly_target,
        kpi_metrics: kpiMetrics
      })
      .eq('id', member_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ [API] Update error:', updateError)
      return NextResponse.json({
        error: 'Failed to update profile',
        details: updateError.message,
        code: updateError.code,
        hint: updateError.hint
      }, { status: 500 })
    }

    console.log('✅ [API] KPI saved successfully:', updatedProfile)

    return NextResponse.json({
      success: true,
      data: updatedProfile
    })

  } catch (error: any) {
    console.error('❌ [API] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
