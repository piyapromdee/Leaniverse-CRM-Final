import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DEBUG: Check what deals exist in database
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [DEBUG] User ID:', user.id);

    // First, check ALL deals in database (no filters)
    const allDealsRes = await supabase
      .from('deals')
      .select('id, user_id, title, stage, created_at')
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG] All deals query result:', allDealsRes);

    // Then check deals for this specific user
    const userDealsRes = await supabase
      .from('deals')
      .select('id, user_id, title, stage, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG] User deals query result:', userDealsRes);

    return NextResponse.json({
      currentUserId: user.id,
      allDeals: {
        count: allDealsRes.data?.length || 0,
        data: allDealsRes.data || [],
        error: allDealsRes.error
      },
      userDeals: {
        count: userDealsRes.data?.length || 0,
        data: userDealsRes.data || [],
        error: userDealsRes.error
      }
    });

  } catch (error) {
    console.error('Debug deals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}