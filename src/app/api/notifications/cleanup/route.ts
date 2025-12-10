import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupAllDuplicateNotifications } from '@/lib/notification-system'
import { notificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧹 [CLEANUP API] Starting notification cleanup for user:', user.id)

    // Check if specific cleanup type is requested
    const body = await request.json().catch(() => ({}))
    const { type } = body

    if (type === 'stale') {
      // Clean up only stale task notifications
      await notificationService.cleanupStaleTaskNotifications()
      return NextResponse.json({ 
        success: true, 
        message: 'Stale task notifications cleaned up successfully' 
      })
    } else {
      // Run both duplicate and stale cleanup
      const duplicateSuccess = await cleanupAllDuplicateNotifications(user.id)
      await notificationService.cleanupStaleTaskNotifications()
      
      if (duplicateSuccess) {
        return NextResponse.json({ 
          success: true, 
          message: 'All notifications cleaned up successfully (duplicates + stale)' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Partial cleanup - stale notifications cleaned, but duplicate cleanup failed' 
        }, { status: 500 })
      }
    }
  } catch (error) {
    console.error('🔥 [CLEANUP API] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}