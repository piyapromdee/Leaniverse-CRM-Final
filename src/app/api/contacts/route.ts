import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserOrgId } from '@/lib/get-user-org';

// GET /api/contacts - Fetch contacts (all for admin, filtered for others)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user and organization info for role-based access
    const { error: orgError, orgId, userId, role } = await getUserOrgId();
    if (orgError) {
      return NextResponse.json({ error: orgError }, { status: 401 });
    }

    console.log('🔍 [GET CONTACTS] User:', userId, 'Role:', role, 'Org:', orgId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('contacts')
      .select(`
        *,
        companies:company_id(id, name)
      `)
      .order('created_at', { ascending: false });

    // Role-based access control
    if (role === 'admin' || role === 'owner') {
      // Admin/Owner users can see ALL contacts
      console.log('🔓 [CONTACTS] Admin/Owner role: showing all contacts');
    } else if (orgId) {
      // Filter by organization for non-admin users
      query = query.eq('org_id', orgId);
      console.log('🔍 [CONTACTS] Filtering by org_id:', orgId);
    } else {
      // Fallback to user_id filtering
      query = query.eq('user_id', userId);
      console.log('🔍 [CONTACTS] Filtering by user_id:', userId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [CONTACTS] Error fetching contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    console.log('✅ [CONTACTS] Fetched contacts count:', data?.length || 0);
    return NextResponse.json({ contacts: data || [] });
  } catch (error) {
    console.error('❌ [CONTACTS] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received contact creation request:', body);
    
    const { name, email, phone, position, company_id, status } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Clean up data and handle UUIDs properly
    const contactData = {
      user_id: user.id,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      position: position?.trim() || null,
      company_id: (company_id && company_id !== 'null' && company_id !== '') ? company_id : null,
      status: status || 'lead'
    };
    
    // Remove null/undefined values to avoid database conflicts
    Object.keys(contactData).forEach(key => {
      if (contactData[key as keyof typeof contactData] === null || 
          contactData[key as keyof typeof contactData] === undefined || 
          contactData[key as keyof typeof contactData] === '') {
        if (key !== 'company_id') { // Keep company_id as null if needed
          delete contactData[key as keyof typeof contactData];
        }
      }
    });
    
    console.log('Prepared contact data for database:', contactData);

    // Try inserting without company join first to avoid potential join issues
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('*')
      .single();

    if (error) {
      console.error('Database error creating contact:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Check if table doesn't exist
      if (error.message && error.message.includes('relation "contacts" does not exist')) {
        return NextResponse.json({ 
          error: 'Contacts table not found - please create the database tables first',
          fallback: true,
          contact: { id: `temp-${Date.now()}`, ...contactData }
        }, { status: 404 });
      }
      
      // Check for column errors
      if (error.code === '42703') {
        return NextResponse.json({ 
          error: `Database column error: ${error.message}`,
          details: 'The contacts table structure may not match the expected schema',
          code: error.code
        }, { status: 400 });
      }
      
      // Check for constraint violations
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Contact already exists with this information',
          details: error.message,
          code: error.code
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create contact', 
        details: error.message,
        code: error.code || 'unknown',
        hint: error.hint || 'Check database connection and table structure'
      }, { status: 500 });
    }

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}