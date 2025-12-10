import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/transaction-service'
import { getCurrentUser } from '@/lib/auth-utils'

// GET - Check if user has purchased a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const { user, error } = await getCurrentUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const hasPurchased = await transactionService.hasUserPurchasedProduct(user.id, productId)
    
    return NextResponse.json({ 
      hasPurchased,
      productId,
      userId: user.id
    })
  } catch (error) {
    console.error('Check product purchase error:', error)
    return NextResponse.json({ error: 'Failed to check purchase status' }, { status: 500 })
  }
}