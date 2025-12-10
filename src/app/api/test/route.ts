import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APIErrorHandler } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST API CALLED ===');
    
    // Test Supabase client creation
    const supabase = await createClient();
    console.log('Supabase client created successfully');
    
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check - User:', user ? 'Authenticated' : 'Not authenticated');
    console.log('Auth check - Error:', authError);
    
    if (authError) {
      return NextResponse.json({ 
        success: true, 
        message: 'API working but not authenticated',
        authError: authError.message 
      });
    }
    
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'API working but no user session' 
      });
    }
    
    // Test database connection
    try {
      const { data: tables, error: dbError } = await supabase
        .from('companies')
        .select('count')
        .limit(1);
        
      console.log('Database test - Result:', tables);
      console.log('Database test - Error:', dbError);
      
      return NextResponse.json({
        success: true,
        message: 'API and database working perfectly!',
        user: { id: user.id, email: user.email },
        database: dbError ? 'Error: ' + dbError.message : 'Connected'
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({
        success: true,
        message: 'API working, database has issues',
        user: { id: user.id, email: user.email },
        database: 'Connection failed: ' + ((dbError as any)?.message || 'Unknown database error')
      });
    }
    
  } catch (error) {
    return APIErrorHandler.handleGenericError('TEST_API', error);
  }
}