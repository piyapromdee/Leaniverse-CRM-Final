import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client with service role key for storage access
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Check if current user is admin
async function isCurrentUserAdmin() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { isAdmin: false, user: null }
    
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return { 
      isAdmin: profile?.role === 'admin', 
      user 
    }
  } catch {
    return { isAdmin: false, user: null }
  }
}

// POST - Upload image to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 })
    }

    const { fileName, fileType, fileData } = body

    if (!fileName || !fileType || !fileData) {
      return NextResponse.json({ 
        error: 'fileName, fileType, and fileData are required' 
      }, { status: 400 })
    }

    // Validate base64 data format
    if (typeof fileData !== 'string' || fileData.trim() === '') {
      return NextResponse.json({ 
        error: 'fileData must be a non-empty base64 string' 
      }, { status: 400 })
    }

    // Validate file type
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Only image files are allowed' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Convert base64 to buffer
    let buffer: Buffer
    try {
      buffer = Buffer.from(fileData, 'base64')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid base64 image data' 
      }, { status: 400 })
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (buffer.length > maxSize) {
      return NextResponse.json({ 
        error: 'File size must be less than 5MB' 
      }, { status: 400 })
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: fileType,
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload image to storage' 
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('product-images')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ 
        error: 'Failed to get public URL for uploaded image' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      publicUrl: urlData.publicUrl,
      path: uploadData.path,
      message: 'Image uploaded successfully'
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}