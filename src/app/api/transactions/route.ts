import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/transaction-service'
import { getCurrentUser } from '@/lib/auth-utils'

// GET - Get user's transactions (authenticated users only)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const transactions = await transactionService.getUserTransactions(user.id)
    
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Get user transactions error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}