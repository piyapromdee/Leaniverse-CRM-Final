import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserSuperAdmin } from '@/lib/roles';

// GET /api/companies - Fetch companies (all for admin/owner, own for regular users)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'sales';
    const userEmail = profile?.email || user.email || '';
    const isAdminOrOwner = userRole === 'admin' || userRole === 'owner' || isUserSuperAdmin(userEmail, userRole);

    console.log('🔍 [GET COMPANIES] User:', user.id, 'Role:', userRole, 'IsAdminOrOwner:', isAdminOrOwner);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    // Only filter by user_id for non-admin/non-owner users
    if (!isAdminOrOwner) {
      query = query.eq('user_id', user.id);
    } else {
      console.log('🔓 [COMPANIES] Admin/Owner role: showing all companies');
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    console.log('✅ [COMPANIES] Fetched companies count:', data?.length || 0);
    return NextResponse.json({ companies: data || [] });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    console.log('Company creation API called');
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received company creation request:', body);
    
    const { name, industry, size, website, phone, email, address, status } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const companyData = {
      user_id: user.id,
      name: name.trim(),
      industry: industry?.trim() || null,
      size: size?.trim() || null,
      website: website?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      status: status || 'prospect'
    };
    
    // Remove null/undefined values
    Object.keys(companyData).forEach(key => {
      if (companyData[key as keyof typeof companyData] === null || 
          companyData[key as keyof typeof companyData] === undefined || 
          companyData[key as keyof typeof companyData] === '') {
        delete companyData[key as keyof typeof companyData];
      }
    });
    
    console.log('Prepared company data for database:', companyData);

    const { data, error } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single();

    if (error) {
      console.error('Database error creating company:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Check if table doesn't exist
      if (error.message && error.message.includes('relation "companies" does not exist')) {
        console.log('Companies table does not exist, returning fallback');
        return NextResponse.json({ 
          error: 'Companies table not found - please create the database tables first',
          fallback: true,
          company: { id: `temp-${Date.now()}`, ...companyData }
        }, { status: 404 });
      }
      
      // Check for column errors
      if (error.code === '42703') {
        return NextResponse.json({ 
          error: `Database column error: ${error.message}`,
          details: 'The companies table structure may not match the expected schema',
          code: error.code
        }, { status: 400 });
      }
      
      // Check for constraint violations
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Company already exists with this name',
          details: error.message,
          code: error.code
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create company', 
        details: error.message,
        code: error.code || 'unknown',
        hint: error.hint || 'Check database connection and table structure'
      }, { status: 500 });
    }

    console.log('Company created successfully:', data);
    return NextResponse.json({ company: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating company:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as any)?.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}