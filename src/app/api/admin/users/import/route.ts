import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    
    if (!user) return false
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return profile?.role === 'admin'
  } catch {
    return false
  }
}

// Generate a random password
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { emails, tagIds } = await request.json()

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Invalid emails array' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const results = {
      total: emails.length,
      successful: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[]
    }

    // Fetch all existing auth users once for performance
    const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers()
    const authUsersByEmail = new Map()
    existingAuthUsers.users.forEach(user => {
      if (user.email) {
        authUsersByEmail.set(user.email, user)
      }
    })

    // Process emails in batches to avoid timeouts
    const batchSize = 10
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      
      for (const email of batch) {
        try {
          // Validate email format
          if (!isValidEmail(email)) {
            results.failed++
            results.errors.push({ email, error: 'Invalid email format' })
            continue
          }

          // Check if user already exists in profiles table
          const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

          if (existingProfile) {
            results.failed++
            results.errors.push({ email, error: 'User profile already exists' })
            continue
          }

          // Check if user exists in auth.users but not in profiles
          const authUser = authUsersByEmail.get(email)

          let userId: string

          if (authUser) {
            // User exists in auth but not in profiles - create profile
            userId = authUser.id
            
            // Create profile for existing auth user
            const { error: profileError } = await adminClient
              .from('profiles')
              .insert({
                id: userId,
                email: email,
                first_name: '-',
                last_name: '-',
                role: 'user'
              })

            if (profileError) {
              results.failed++
              results.errors.push({ email, error: `Failed to create profile: ${profileError.message}` })
              continue
            }
          } else {
            // User doesn't exist at all - create both auth user and profile
            const password = generatePassword()
            const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
              email,
              password,
              user_metadata: {
                first_name: '-',
                last_name: '-'
              },
              email_confirm: true // Auto-confirm email for admin-created users
            })

            if (authError) {
              results.failed++
              results.errors.push({ email, error: authError.message })
              continue
            }

            if (!authData.user) {
              results.failed++
              results.errors.push({ email, error: 'Failed to create user' })
              continue
            }

            userId = authData.user.id
          }

          // User created successfully (either auth+profile or just profile)
          results.successful++

          // Assign tags if provided
          if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
            try {
              const tagAssignments = tagIds.map(tagId => ({
                user_id: userId,
                tag_id: tagId
              }))

              const { error: tagError } = await adminClient
                .from('user_tags')
                .insert(tagAssignments)

              if (tagError) {
                console.warn(`Failed to assign tags to user ${email}:`, tagError)
                // Don't fail the import for tag assignment errors
              }
            } catch (tagError) {
              console.warn(`Error assigning tags to user ${email}:`, tagError)
            }
          }
        } catch (error) {
          results.failed++
          results.errors.push({ 
            email, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      results
    })

  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}