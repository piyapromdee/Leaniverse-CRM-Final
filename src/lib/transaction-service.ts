import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

export interface TransactionData {
  customerUserId?: string
  stripePaymentIntentId: string
  stripeCustomerId?: string
  productId: string
  priceId: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'canceled' | 'processing'
  paymentMethodTypes: string[]
  metadata?: Record<string, any>
}

export interface UserPurchaseData {
  userId: string
  transactionId: string
  productId: string
  accessGranted: boolean
  accessExpiresAt?: string
}

export class TransactionService {
  private adminClient = createAdminClient()

  async createTransaction(data: TransactionData) {
    try {
      // For admin_user_id, we need to handle different cases:
      // 1. If customerUserId exists, use it
      // 2. If no customerUserId (guest), find a system admin or use a default
      let adminUserId = data.customerUserId
      
      if (!adminUserId) {
        // For guest purchases, try to find a system admin user
        const { data: adminUser } = await this.adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single()
        
        adminUserId = adminUser?.id || null
      }

      const { data: transaction, error } = await this.adminClient
        .from('transactions')
        .insert({
          admin_user_id: adminUserId,
          customer_user_id: data.customerUserId || null,
          stripe_payment_intent_id: data.stripePaymentIntentId,
          stripe_customer_id: data.stripeCustomerId || null,
          product_id: data.productId,
          price_id: data.priceId,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          payment_method_types: data.paymentMethodTypes,
          metadata: data.metadata || {}
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create transaction:', error)
        throw error
      }

      console.log('Transaction created successfully:', transaction.id)
      return transaction
    } catch (error) {
      console.error('Transaction service error:', error)
      throw error
    }
  }

  async updateTransactionStatus(stripePaymentIntentId: string, status: TransactionData['status']) {
    try {
      const { data: transaction, error } = await this.adminClient
        .from('transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('stripe_payment_intent_id', stripePaymentIntentId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update transaction status:', error)
        throw error
      }

      return transaction
    } catch (error) {
      console.error('Transaction status update error:', error)
      throw error
    }
  }

  async createUserPurchase(data: UserPurchaseData) {
    try {
      const { data: purchase, error } = await this.adminClient
        .from('user_purchases')
        .insert({
          user_id: data.userId,
          transaction_id: data.transactionId,
          product_id: data.productId,
          access_granted: data.accessGranted,
          access_expires_at: data.accessExpiresAt || null
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create user purchase:', error)
        throw error
      }

      console.log('User purchase created successfully:', purchase.id)
      return purchase
    } catch (error) {
      console.error('User purchase creation error:', error)
      throw error
    }
  }

  async getUserPurchases(userId: string) {
    try {
      const { data: purchases, error } = await this.adminClient
        .from('user_purchases')
        .select(`
          id,
          access_granted,
          access_expires_at,
          created_at,
          product:products(id, name, description, short_description),
          transaction:transactions(id, amount, currency, status, created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to get user purchases:', error)
        throw error
      }

      return purchases
    } catch (error) {
      console.error('Get user purchases error:', error)
      throw error
    }
  }

  async getUserTransactions(userId: string) {
    try {
      const { data: transactions, error } = await this.adminClient
        .from('transactions')
        .select(`
          id,
          stripe_payment_intent_id,
          amount,
          currency,
          status,
          payment_method_types,
          metadata,
          created_at,
          product:products(id, name),
          price:prices(id, type, interval, interval_count)
        `)
        .eq('customer_user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to get user transactions:', error)
        throw error
      }

      return transactions
    } catch (error) {
      console.error('Get user transactions error:', error)
      throw error
    }
  }

  async getAllTransactions(limit = 50, offset = 0) {
    try {
      // First get transactions without the user relationship
      const { data: transactions, error } = await this.adminClient
        .from('transactions')
        .select(`
          id,
          customer_user_id,
          stripe_payment_intent_id,
          amount,
          currency,
          status,
          payment_method_types,
          metadata,
          created_at,
          product:products(id, name),
          price:prices(id, type, interval, interval_count)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Failed to get all transactions:', error)
        throw error
      }

      // Get unique user IDs from transactions
      const userIds = [...new Set(
        transactions
          ?.filter(t => t.customer_user_id)
          .map(t => t.customer_user_id)
      )]

      // Fetch user profiles separately if we have user IDs
      let userProfiles: Record<string, any> = {}
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await this.adminClient
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds)

        if (!profilesError && profiles) {
          userProfiles = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Combine transactions with user data
      const transactionsWithUsers = transactions?.map(transaction => ({
        ...transaction,
        user: transaction.customer_user_id ? userProfiles[transaction.customer_user_id] || null : null
      }))

      return transactionsWithUsers
    } catch (error) {
      console.error('Get all transactions error:', error)
      throw error
    }
  }

  async getTransactionStats() {
    try {
      // Get total transactions and amounts by status
      const { data: stats, error } = await this.adminClient
        .from('transactions')
        .select('status, amount, currency, created_at')

      if (error) {
        console.error('Failed to get transaction stats:', error)
        throw error
      }

      // Calculate stats
      const totalTransactions = stats.length
      const successfulTransactions = stats.filter(t => t.status === 'succeeded').length
      const totalRevenue = stats
        .filter(t => t.status === 'succeeded')
        .reduce((sum, t) => sum + t.amount, 0)
      
      // Group by currency for revenue breakdown
      const revenueByCurrency = stats
        .filter(t => t.status === 'succeeded')
        .reduce((acc, t) => {
          acc[t.currency] = (acc[t.currency] || 0) + t.amount
          return acc
        }, {} as Record<string, number>)

      // Recent transactions (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const recentTransactions = stats.filter(
        t => new Date(t.created_at) >= thirtyDaysAgo
      ).length

      return {
        totalTransactions,
        successfulTransactions,
        failedTransactions: stats.filter(t => t.status === 'failed').length,
        totalRevenue,
        revenueByCurrency,
        recentTransactions,
        conversionRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0
      }
    } catch (error) {
      console.error('Get transaction stats error:', error)
      throw error
    }
  }

  async hasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    try {
      const { data: purchase, error } = await this.adminClient
        .from('user_purchases')
        .select('id, access_granted, access_expires_at')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('access_granted', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Failed to check user purchase:', error)
        return false
      }

      if (!purchase) {
        return false
      }

      // Check if access has expired for recurring products
      if (purchase.access_expires_at) {
        const expiryDate = new Date(purchase.access_expires_at)
        const now = new Date()
        return now <= expiryDate
      }

      // For one-time purchases, access doesn't expire
      return true
    } catch (error) {
      console.error('Check user purchase error:', error)
      return false
    }
  }

  calculateSubscriptionExpiry(interval: string, intervalCount: number = 1): string {
    const now = new Date()
    
    switch (interval) {
      case 'day':
        now.setDate(now.getDate() + intervalCount)
        break
      case 'week':
        now.setDate(now.getDate() + (intervalCount * 7))
        break
      case 'month':
        now.setMonth(now.getMonth() + intervalCount)
        break
      case 'year':
        now.setFullYear(now.getFullYear() + intervalCount)
        break
      default:
        // Default to 1 month for unknown intervals
        now.setMonth(now.getMonth() + 1)
    }
    
    return now.toISOString()
  }

  async createUserAccountForGuest(customerData: {
    email: string
    firstName?: string
    lastName?: string
    productName: string
  }): Promise<{ userId: string; tempPassword: string } | null> {
    try {
      console.log('Creating user account for guest:', customerData.email)

      // Check if user already exists by querying profiles
      const { data: existingProfile, error: checkError } = await this.adminClient
        .from('profiles')
        .select('id, email')
        .eq('email', customerData.email)
        .single()
      
      if (existingProfile && !checkError) {
        console.log('User already exists:', customerData.email)
        return { userId: existingProfile.id, tempPassword: '' }
      }

      // Generate a secure temporary password
      const tempPassword = randomBytes(16).toString('hex')

      // Create new user account
      const { data: newUser, error: createError } = await this.adminClient.auth.admin.createUser({
        email: customerData.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          first_name: customerData.firstName || '',
          last_name: customerData.lastName || '',
          created_via: 'guest_purchase',
          product_purchased: customerData.productName
        }
      })

      if (createError || !newUser?.user) {
        console.error('Failed to create user account:', createError)
        return null
      }

      console.log('User account created successfully:', newUser.user.id)

      // The profile will be automatically created by the database trigger
      // Wait a brief moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        userId: newUser.user.id,
        tempPassword
      }
    } catch (error) {
      console.error('Error creating user account for guest:', error)
      return null
    }
  }

  async findOrCreateUserByEmail(customerData: {
    email: string
    firstName?: string
    lastName?: string
    productName: string
  }): Promise<{ userId: string; isNewUser: boolean; tempPassword?: string }> {
    try {
      // First check if user already exists by querying profiles table
      const { data: existingProfile, error: checkError } = await this.adminClient
        .from('profiles')
        .select('id, email')
        .eq('email', customerData.email)
        .single()
      
      if (existingProfile && !checkError) {
        console.log('Found existing user by email:', customerData.email)
        return { 
          userId: existingProfile.id, 
          isNewUser: false 
        }
      }

      // Create new user account
      const accountResult = await this.createUserAccountForGuest(customerData)
      
      if (!accountResult) {
        throw new Error('Failed to create user account')
      }

      return {
        userId: accountResult.userId,
        isNewUser: true,
        tempPassword: accountResult.tempPassword
      }
    } catch (error) {
      console.error('Error in findOrCreateUserByEmail:', error)
      throw error
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService()