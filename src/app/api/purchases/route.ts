import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/transaction-service'
import { getCurrentUser } from '@/lib/auth-utils'

// GET - Get user's purchases (authenticated users only)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const purchases = await transactionService.getUserPurchases(user.id)
    
    return NextResponse.json({ purchases })
  } catch (error) {
    console.error('Get user purchases error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}