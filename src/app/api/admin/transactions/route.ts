import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/transaction-service'
import { requireAdmin } from '@/lib/auth-utils'

// GET - Get all transactions (admin only)
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin()
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const transactions = await transactionService.getAllTransactions(limit, offset)
    const stats = await transactionService.getTransactionStats()
    
    return NextResponse.json({ transactions, stats })
  } catch (error) {
    console.error('Get all transactions error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}