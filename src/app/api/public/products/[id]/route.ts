import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch single public product by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    const { id } = resolvedParams

    // Check if id is a UUID (for direct ID lookup) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    // Fetch product
    let productQuery = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        short_description,
        slug,
        images,
        features,
        metadata,
        created_at
      `)
      .eq('public_visible', true)
      .eq('active', true)

    if (isUUID) {
      productQuery = productQuery.eq('id', id)
    } else {
      productQuery = productQuery.eq('slug', id)
    }

    const { data: products, error: productError } = await productQuery

    if (productError) {
      console.error('Error fetching public product:', productError)
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = products[0]

    // Fetch prices for this product
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select(`
        id,
        unit_amount,
        currency,
        type,
        interval,
        interval_count,
        active
      `)
      .eq('product_id', product.id)
      .eq('active', true)

    if (pricesError) {
      console.error('Error fetching prices:', pricesError)
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
    }

    // Combine product with prices
    const transformedProduct = {
      ...product,
      images: product.images || [],
      features: product.features || [],
      metadata: product.metadata || {},
      prices: prices || []
    }

    return NextResponse.json({ product: transformedProduct })
  } catch (error) {
    console.error('Public product fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}