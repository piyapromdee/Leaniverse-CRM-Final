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

// POST - Unlink single product from Stripe
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { isAdmin, user } = await isCurrentUserAdmin()
    if (!isAdmin || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get product with prices
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select(`
        *,
        prices (*)
      `)
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.stripe_linked) {
      return NextResponse.json({ 
        error: 'Product is not linked to Stripe' 
      }, { status: 400 })
    }

    // Unlink product in database (preserve the product, just remove Stripe connection)
    const { data: updatedProduct, error: updateProductError } = await adminClient
      .from('products')
      .update({
        stripe_product_id: null,
        stripe_linked: false,
        stripe_link_status: 'unlinked',
        last_stripe_sync: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (updateProductError) {
      console.error('Error updating product:', updateProductError)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    // Unlink all prices for this product
    const priceResults = []
    for (const price of product.prices) {
      if (!price.stripe_linked) continue // Skip already unlinked prices

      const { data: updatedPrice, error: updatePriceError } = await adminClient
        .from('prices')
        .update({
          stripe_price_id: null,
          stripe_linked: false,
          stripe_link_status: 'unlinked',
          last_stripe_sync: new Date().toISOString()
        })
        .eq('id', price.id)
        .select()
        .single()

      if (updatePriceError) {
        console.error('Error updating price:', updatePriceError)
        priceResults.push({
          priceId: price.id,
          success: false,
          error: 'Failed to update price in database'
        })
      } else {
        priceResults.push({
          priceId: price.id,
          success: true
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct,
      priceResults: priceResults,
      message: `Product unlinked from Stripe successfully. ${priceResults.filter(r => r.success).length} of ${priceResults.length} prices unlinked. Product data preserved for future reconnection.`
    })
  } catch (error) {
    console.error('Unlink product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}