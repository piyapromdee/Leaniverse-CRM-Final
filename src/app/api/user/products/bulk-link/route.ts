import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

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

// Get Stripe account configuration
async function getStripeConfig() {
  const adminClient = createAdminClient()
  const { data: stripeConfig, error } = await adminClient
    .from('stripe_config')
    .select('*')
    .single()

  return { stripeConfig, error }
}

// Simple string similarity function
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// GET - Get suggested mappings for bulk linking
export async function GET() {
  try {
    // Check if user is admin
    const { isAdmin } = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get Stripe configuration
    const { stripeConfig, error: stripeError } = await getStripeConfig()
    if (stripeError || !stripeConfig) {
      return NextResponse.json({ 
        error: 'No Stripe account connected. Please connect Stripe first.' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get unlinked products
    const { data: unlinkedProducts, error: productsError } = await adminClient
      .from('products')
      .select(`
        *,
        prices (*)
      `)
      .eq('stripe_linked', false)
      .eq('active', true)

    if (productsError) {
      console.error('Error fetching unlinked products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    if (!unlinkedProducts || unlinkedProducts.length === 0) {
      return NextResponse.json({ 
        suggestions: [],
        message: 'No unlinked products found'
      })
    }

    // Get Stripe products
    let stripeProducts: Stripe.Product[] = []
    try {
      const stripeProductsList = await stripe.products.list({
        limit: 100,
        active: true
      }, {
        stripeAccount: stripeConfig.stripe_account_id
      })
      stripeProducts = stripeProductsList.data
    } catch (stripeListError) {
      console.error('Error fetching Stripe products:', stripeListError)
      return NextResponse.json({ 
        error: 'Failed to fetch Stripe products' 
      }, { status: 500 })
    }

    // Generate suggestions by matching product names
    const suggestions = unlinkedProducts.map(product => {
      const matches = stripeProducts
        .map(stripeProduct => ({
          stripeProduct,
          similarity: calculateSimilarity(product.name, stripeProduct.name)
        }))
        .filter(match => match.similarity > 0.3) // Only suggest matches above 30% similarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3) // Top 3 matches

      return {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          priceCount: product.prices.length
        },
        suggestedMatches: matches.map(match => ({
          stripeProductId: match.stripeProduct.id,
          name: match.stripeProduct.name,
          description: match.stripeProduct.description,
          similarity: Math.round(match.similarity * 100),
          confidence: match.similarity > 0.8 ? 'high' : match.similarity > 0.6 ? 'medium' : 'low'
        })),
        recommendation: matches.length > 0 && matches[0].similarity > 0.8 
          ? 'auto-link' 
          : matches.length > 0 
            ? 'review-suggested' 
            : 'create-new'
      }
    })

    return NextResponse.json({ 
      suggestions,
      stats: {
        totalUnlinkedProducts: unlinkedProducts.length,
        totalStripeProducts: stripeProducts.length,
        highConfidenceMatches: suggestions.filter(s => s.recommendation === 'auto-link').length,
        suggestedMatches: suggestions.filter(s => s.recommendation === 'review-suggested').length,
        createNewRecommended: suggestions.filter(s => s.recommendation === 'create-new').length
      }
    })
  } catch (error) {
    console.error('Bulk link suggestions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Execute bulk linking operations
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { mappings } = body // Array of { productId, action: 'link' | 'create' | 'skip', stripeProductId? }

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'mappings array is required' }, { status: 400 })
    }

    // Get Stripe configuration
    const { stripeConfig, error: stripeError } = await getStripeConfig()
    if (stripeError || !stripeConfig) {
      return NextResponse.json({ 
        error: 'No Stripe account connected. Please connect Stripe first.' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const results = []

    for (const mapping of mappings) {
      const { productId, action, stripeProductId } = mapping

      try {
        // Get product
        const { data: product, error: productError } = await adminClient
          .from('products')
          .select(`
            *,
            prices (*)
          `)
          .eq('id', productId)
          .single()

        if (productError || !product) {
          results.push({
            productId,
            success: false,
            error: 'Product not found'
          })
          continue
        }

        if (action === 'skip') {
          results.push({
            productId,
            success: true,
            action: 'skipped',
            message: 'Product skipped as requested'
          })
          continue
        }

        let stripeProduct

        if (action === 'link' && stripeProductId) {
          // Link to existing Stripe product
          try {
            stripeProduct = await stripe.products.retrieve(stripeProductId, {
              stripeAccount: stripeConfig.stripe_account_id
            })
          } catch (stripeRetrieveError) {
            results.push({
              productId,
              success: false,
              error: 'Invalid Stripe product ID or product not found in Stripe'
            })
            continue
          }
        } else if (action === 'create') {
          // Create new Stripe product
          try {
            stripeProduct = await stripe.products.create({
              name: product.name,
              description: product.description || undefined,
              active: product.active,
            }, {
              stripeAccount: stripeConfig.stripe_account_id
            })
          } catch (stripeCreateError) {
            console.error('Error creating Stripe product:', stripeCreateError)
            results.push({
              productId,
              success: false,
              error: 'Failed to create product in Stripe'
            })
            continue
          }
        } else {
          results.push({
            productId,
            success: false,
            error: 'Invalid action or missing stripeProductId for link action'
          })
          continue
        }

        // Update product in database
        const { data: updatedProduct, error: updateProductError } = await adminClient
          .from('products')
          .update({
            stripe_product_id: stripeProduct.id,
            stripe_linked: true,
            stripe_link_status: 'linked',
            last_stripe_sync: new Date().toISOString()
          })
          .eq('id', productId)
          .select()
          .single()

        if (updateProductError) {
          results.push({
            productId,
            success: false,
            error: 'Failed to update product in database'
          })
          continue
        }

        // Link prices
        const priceResults = []
        for (const price of product.prices) {
          if (price.stripe_linked) continue

          try {
            const stripePriceData: Stripe.PriceCreateParams = {
              product: stripeProduct.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              active: price.active,
            }

            if (price.type === 'recurring') {
              stripePriceData.recurring = {
                interval: price.interval || 'month',
                interval_count: price.interval_count || 1
              }
            }

            const stripePrice = await stripe.prices.create(stripePriceData, {
              stripeAccount: stripeConfig.stripe_account_id
            })

            const { error: updatePriceError } = await adminClient
              .from('prices')
              .update({
                stripe_price_id: stripePrice.id,
                stripe_linked: true,
                stripe_link_status: 'linked',
                last_stripe_sync: new Date().toISOString()
              })
              .eq('id', price.id)

            priceResults.push({
              priceId: price.id,
              success: !updatePriceError
            })
          } catch (priceError) {
            priceResults.push({
              priceId: price.id,
              success: false
            })
          }
        }

        results.push({
          productId,
          success: true,
          action,
          stripeProductId: stripeProduct.id,
          pricesLinked: priceResults.filter(p => p.success).length,
          totalPrices: priceResults.length,
          message: `Product ${action === 'create' ? 'created and linked' : 'linked'} successfully`
        })
      } catch (error) {
        console.error('Error processing product:', error)
        results.push({
          productId,
          success: false,
          error: 'Unexpected error processing product'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    return NextResponse.json({ 
      success: true,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
        message: `Bulk linking completed: ${successCount}/${totalCount} products processed successfully`
      }
    })
  } catch (error) {
    console.error('Bulk link execution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}