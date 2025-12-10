import { NextRequest, NextResponse } from 'next/server'
import { transactionService } from '@/lib/transaction-service'
import { requireAdmin } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Get user details with transactions and purchases (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requireAdmin()
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch user profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch user tags
    const { data: userTags, error: tagsError } = await adminClient
      .from('user_tags')
      .select(`
        tag_id,
        tags (
          id,
          name,
          color,
          description
        )
      `)
      .eq('user_id', userId)

    // Transform tags data
    const tags = userTags?.map(ut => ({
      id: (ut.tags as any)?.id,
      name: (ut.tags as any)?.name,
      color: (ut.tags as any)?.color,
      description: (ut.tags as any)?.description
    })).filter(tag => tag.id) || []

    // Fetch user transactions
    const transactions = await transactionService.getUserTransactions(userId)

    // Fetch user purchases
    const purchases = await transactionService.getUserPurchases(userId)

    // Calculate statistics
    const successfulTransactions = transactions.filter(t => t.status === 'succeeded')
    
    // Group spending by currency instead of summing different currencies
    const spendingByCurrency = successfulTransactions.reduce((acc, t) => {
      const currency = t.currency.toUpperCase()
      acc[currency] = (acc[currency] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
    
    const activePurchases = purchases.filter(purchase => {
      if (!purchase.access_granted) return false
      if (!purchase.access_expires_at) return true
      return new Date() <= new Date(purchase.access_expires_at)
    }).length

    const stats = {
      totalTransactions: transactions.length,
      successfulTransactions: successfulTransactions.length,
      spendingByCurrency,
      activePurchases
    }

    return NextResponse.json({
      profile,
      tags,
      transactions,
      purchases,
      stats
    })
  } catch (error) {
    console.error('Get user details error:', error)
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 })
  }
}

// PUT - Update user profile (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, error } = await requireAdmin()
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id
    const body = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { first_name, last_name, role, is_disabled } = body

    const adminClient = createAdminClient()

    // Update user profile
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        first_name,
        last_name,
        role,
        is_disabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'User profile updated successfully'
    })
  } catch (error) {
    console.error('Update user profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}