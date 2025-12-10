import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Public client for reading public product data
function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient(supabaseUrl, anonKey)
}

// GET - Fetch single product with prices (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const publicClient = createPublicClient()

    // Fetch product with prices
    const { data: product, error } = await publicClient
      .from('products')
      .select(`
        *,
        prices (*)
      `)
      .eq('id', productId)
      .eq('active', true)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // For public products, only show if they're visible
    if (!product.public_visible) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Only return active prices
    const activePrices = (product.prices || []).filter((price: any) => price.active)

    return NextResponse.json({ 
      product: {
        ...product,
        prices: activePrices
      }
    })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}