import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle error from Supabase
  if (errorParam) {
    console.error('Auth callback error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/auth/sign-in?error=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  // Handle code exchange (PKCE flow)
  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Code exchange error:', error.message)
        return NextResponse.redirect(`${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`)
      }

      // If this is a password recovery, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      // Otherwise redirect to the next page or dashboard
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(`${origin}/auth/sign-in?error=Authentication failed`)
    }
  }

  // No code provided - might be hash-based flow, redirect to reset password
  // The client-side will handle the hash tokens
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/reset-password`)
  }

  // Return the user to sign-in
  return NextResponse.redirect(`${origin}/auth/sign-in`)
}
