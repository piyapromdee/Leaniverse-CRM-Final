import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Fetch all public products
export async function GET() {
  try {
    const supabase = await createClient()

    // First, fetch products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        short_description,
        slug,
        images,
        features,
        stripe_linked,
        created_at
      `)
      .eq('public_visible', true)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('Error fetching public products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [], count: 0 })
    }

    // Then fetch their prices
    const productIds = products.map(p => p.id)
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select(`
        id,
        product_id,
        unit_amount,
        currency,
        type,
        interval,
        interval_count,
        active,
        stripe_linked
      `)
      .in('product_id', productIds)
      .eq('active', true)

    if (pricesError) {
      console.error('Error fetching prices:', pricesError)
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
    }

    // Combine products with their prices
    const transformedProducts = products.map(product => ({
      ...product,
      images: product.images || [],
      features: product.features || [],
      prices: prices?.filter(price => price.product_id === product.id) || []
    })).filter(product => product.prices.length > 0) // Only include products with prices

    return NextResponse.json({ 
      products: transformedProducts,
      count: transformedProducts.length 
    })
  } catch (error) {
    console.error('Public products fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}