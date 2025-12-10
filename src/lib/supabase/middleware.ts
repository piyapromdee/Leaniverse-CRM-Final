import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { isUserSuperAdmin, hasAdminAccess } from '@/lib/roles'

export async function updateSession(request: NextRequest) {
  console.log('🚀 MIDDLEWARE: Processing request for:', request.nextUrl.pathname)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if user is not authenticated
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/'
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    return NextResponse.redirect(url)
  }

  // CRITICAL SECURITY: Check if authenticated user is disabled (applies to ALL authenticated pages)
  if (
    user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/'
  ) {
    try {
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_disabled')
        .eq('id', user.id)
        .single()

      // If account is disabled, sign out and redirect to login
      if (profile?.is_disabled) {
        console.log('🚫 MIDDLEWARE: Disabled user detected, signing out:', user.id)
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/auth/sign-in'
        url.searchParams.set('message', 'Your account has been disabled. Please contact an administrator.')
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('MIDDLEWARE: Error checking disabled status:', error)
    }
  }

  // Role-based redirects - redirect users to their appropriate dashboard
  console.log('🔍 MIDDLEWARE: Checking redirect for path:', request.nextUrl.pathname, 'User ID:', user?.id)
  if (user && (
    request.nextUrl.pathname === '/dashboard' ||
    request.nextUrl.pathname === '/dashboard/'
  )) {
    console.log('🔍 MIDDLEWARE: Dashboard path detected, checking user role...')
    try {
      // Use service role client to get user profile (bypasses RLS)
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, is_disabled')
        .eq('id', user.id)
        .single()

      console.log('🔍 MIDDLEWARE: Profile query result:', { profile, profileError })

      if (!profileError && profile && !profile.is_disabled) {
        const url = request.nextUrl.clone()

        // Admin users can now access the sales dashboard
        // They will use the Admin Panel button to navigate to admin features
        // No automatic redirect for admin users

        // Redirect owner users to financial dashboard
        if (profile.role === 'owner') {
          console.log('Middleware: Redirecting owner user to /dashboard/financial')
          url.pathname = '/dashboard/financial'
          return NextResponse.redirect(url)
        }

        console.log('Middleware: User with role', profile.role, 'staying on dashboard')
      }
    } catch (error) {
      console.error('Middleware: Error checking user role for redirect:', error)
    }
  }

  // Admin route protection - check if accessing admin areas
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    try {
      // Use service role client to check admin status (bypasses RLS)
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, is_disabled, email')
        .eq('id', user.id)
        .single()

      // Check if user has admin access (including Super Admin by email)
      const userEmail = profile?.email || user.email || ''
      const userHasAdminAccess = hasAdminAccess(profile?.role, userEmail) || isUserSuperAdmin(userEmail, profile?.role)

      // If profile doesn't exist, user doesn't have admin access, or account is disabled
      if (profileError || !profile || !userHasAdminAccess || profile.is_disabled) {
        console.log('Middleware: Non-admin user attempting to access admin area, redirecting to dashboard')
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      console.log('Middleware: Admin access granted for:', request.nextUrl.pathname, '- User:', userEmail, 'SuperAdmin:', isUserSuperAdmin(userEmail, profile?.role))
      
      // Add enhanced security headers for admin routes
      supabaseResponse.headers.set('X-Frame-Options', 'DENY')
      supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
      supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    } catch (error) {
      console.error('Middleware: Error checking admin status:', error)
      // On error, redirect to dashboard for safety
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Admin API protection - check if accessing admin API endpoints
  if (user && request.nextUrl.pathname.startsWith('/api/admin')) {
    try {
      // Use service role client to check admin status (bypasses RLS)
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, is_disabled, email')
        .eq('id', user.id)
        .single()

      // Check if user has admin access (including Super Admin by email)
      const apiUserEmail = profile?.email || user.email || ''
      const apiUserHasAdminAccess = hasAdminAccess(profile?.role, apiUserEmail) || isUserSuperAdmin(apiUserEmail, profile?.role)

      // If profile doesn't exist, user doesn't have admin access, or account is disabled
      if (profileError || !profile || !apiUserHasAdminAccess || profile.is_disabled) {
        console.log('Middleware: Non-admin user attempting to access admin API, returning 403')
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      console.log('Middleware: Admin API access granted for:', request.nextUrl.pathname, '- User:', apiUserEmail, 'SuperAdmin:', isUserSuperAdmin(apiUserEmail, profile?.role))
    } catch (error) {
      console.error('Middleware: Error checking admin status for API:', error)
      // On error, return 403 for safety
      return NextResponse.json(
        { error: 'Forbidden: Unable to verify admin access' },
        { status: 403 }
      )
    }
  }

  // Enhanced CSP for Stripe PaymentElement with required permissions
  if (request.nextUrl.pathname.includes('/checkout') || request.nextUrl.pathname.startsWith('/products/')) {
    console.log('Adding enhanced Stripe CSP for:', request.nextUrl.pathname)
    
    const stripeCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network https://*.stripe.network https://*.hcaptcha.com",
      "style-src 'self' 'unsafe-inline' https://*.stripe.com https://*.stripe.network https://*.hcaptcha.com",
      "frame-src 'self' https://js.stripe.com https://*.stripe.com https://hooks.stripe.com https://m.stripe.network https://*.stripe.network https://*.hcaptcha.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://m.stripe.network https://*.stripe.network https://*.hcaptcha.com https://*.supabase.co wss://*.supabase.co",
      "img-src 'self' data: blob: https: https://*.stripe.com https://*.stripe.network",
      "font-src 'self' data: https://*.stripe.com https://*.stripe.network https://*.hcaptcha.com",
      "worker-src 'self' blob:",
      "child-src 'self' https://*.stripe.com https://m.stripe.network https://*.stripe.network https://*.hcaptcha.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.stripe.com https://*.stripe.network https://*.hcaptcha.com"
    ].join('; ')
    
    supabaseResponse.headers.set('Content-Security-Policy', stripeCSP)
  } else if (request.nextUrl.pathname.startsWith('/admin')) {
    // Strict CSP for admin routes
    const adminCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.stripe.com",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    
    supabaseResponse.headers.set('Content-Security-Policy', adminCSP)
    console.log('Admin CSP applied to:', request.nextUrl.pathname)
  } else {
    // Basic CSP for other pages
    const basicCSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:; font-src 'self' data:"
    supabaseResponse.headers.set('Content-Security-Policy', basicCSP)
    console.log('Basic CSP applied to:', request.nextUrl.pathname)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}