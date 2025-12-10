import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client with service role key
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

// Helper function to extract file path from Supabase Storage URL
function extractFilePathFromUrl(url: string): string | null {
  try {
    // Supabase storage URLs typically look like:
    // https://[project].supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === 'public')
    
    if (bucketIndex === -1 || bucketIndex + 2 >= pathParts.length) {
      return null
    }
    
    // Skip 'public' and bucket name, get the file path
    const filePath = pathParts.slice(bucketIndex + 2).join('/')
    return filePath
  } catch {
    return null
  }
}

// DELETE - Delete image from Supabase Storage
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json({ 
        error: 'Image URL is required' 
      }, { status: 400 })
    }

    // Extract file path from URL
    const filePath = extractFilePathFromUrl(imageUrl)
    if (!filePath) {
      return NextResponse.json({ 
        error: 'Invalid image URL format' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Delete the file from storage
    const { error: deleteError } = await adminClient.storage
      .from('product-images')
      .remove([filePath])

    if (deleteError) {
      console.error('Error deleting image from storage:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete image from storage' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Image deleted successfully',
      deletedPath: filePath
    })
  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}