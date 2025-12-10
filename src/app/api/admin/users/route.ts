import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { APIErrorHandler } from '@/lib/api-error-handler'
import {
  isUserSuperAdmin,
  hasAdminAccess,
  canModifyUser,
  canChangeRole,
  canDeleteUser,
  canDisableUser,
  ROLES
} from '@/lib/roles'

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

// Get current user with full details for permission checks
async function getCurrentUserDetails() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: profile?.email || user.email || '',
      role: profile?.role || 'user',
      isSuperAdmin: isUserSuperAdmin(profile?.email || user.email, profile?.role),
      hasAdminAccess: hasAdminAccess(profile?.role, profile?.email || user.email)
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    // Get current user details
    const currentUser = await getCurrentUserDetails()
    if (!currentUser || !currentUser.hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use admin client to fetch all users
    const adminClient = createAdminClient()
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return APIErrorHandler.handleDatabaseError('ADMIN_USERS_GET', error, { action: 'fetch_users' })
    }

    // Enhance profiles with Super Admin status
    const enhancedProfiles = (profiles || []).map(profile => ({
      ...profile,
      is_super_admin: isUserSuperAdmin(profile.email, profile.role),
      effective_role: isUserSuperAdmin(profile.email, profile.role) ? 'super_admin' : profile.role
    }))

    return APIErrorHandler.createSuccessResponse({
      users: enhancedProfiles,
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        isSuperAdmin: currentUser.isSuperAdmin
      }
    })
  } catch (error) {
    return APIErrorHandler.handleGenericError('ADMIN_USERS_GET', error)
  }
}

export async function POST(request: Request) {
  try {
    // Get current user details for permission checks
    const currentUser = await getCurrentUserDetails()
    if (!currentUser || !currentUser.hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { action, userId } = await request.json()
    const adminClient = createAdminClient()

    // Get target user details for permission checks
    const { data: targetUser, error: targetError } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return APIErrorHandler.handleValidationError('ADMIN_USERS_POST', 'User not found', { userId })
    }

    // Check if target user is a Super Admin
    const targetIsSuperAdmin = isUserSuperAdmin(targetUser.email, targetUser.role)

    switch (action) {
      case 'promote':
        // Check permission to change role
        const promoteCheck = canChangeRole(
          currentUser.email,
          currentUser.role,
          targetUser.email,
          targetUser.role,
          ROLES.ADMIN
        )
        if (!promoteCheck.allowed) {
          return NextResponse.json({ error: promoteCheck.reason }, { status: 403 })
        }

        const { error: promoteError } = await adminClient
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', userId)

        if (promoteError) {
          return APIErrorHandler.handleDatabaseError('ADMIN_USERS_PROMOTE', promoteError, { userId, action: 'promote' })
        }
        return APIErrorHandler.createSuccessResponse(null, 'User promoted to admin')

      case 'demote':
        // SUPER ADMIN PROTECTION: Cannot demote Super Admin
        if (targetIsSuperAdmin) {
          return NextResponse.json({
            error: 'Super Admin accounts cannot be demoted. This role is immutable.'
          }, { status: 403 })
        }

        // Check permission to change role
        const demoteCheck = canChangeRole(
          currentUser.email,
          currentUser.role,
          targetUser.email,
          targetUser.role,
          ROLES.SALES
        )
        if (!demoteCheck.allowed) {
          return NextResponse.json({ error: demoteCheck.reason }, { status: 403 })
        }

        const { error: demoteError } = await adminClient
          .from('profiles')
          .update({ role: 'sales' })
          .eq('id', userId)

        if (demoteError) {
          return APIErrorHandler.handleDatabaseError('ADMIN_USERS_DEMOTE', demoteError, { userId, action: 'demote' })
        }
        return APIErrorHandler.createSuccessResponse(null, 'Admin privileges removed - user role changed to Sales')

      case 'disable':
        // SUPER ADMIN PROTECTION: Cannot disable Super Admin
        if (targetIsSuperAdmin) {
          return NextResponse.json({
            error: 'Super Admin accounts cannot be disabled. This role is immutable.'
          }, { status: 403 })
        }

        // Check permission to disable
        const disableCheck = canDisableUser(
          currentUser.email,
          currentUser.role,
          targetUser.email,
          targetUser.role
        )
        if (!disableCheck.allowed) {
          return NextResponse.json({ error: disableCheck.reason }, { status: 403 })
        }

        // First, update the profile to mark as disabled
        const { error: disableError } = await adminClient
          .from('profiles')
          .update({ is_disabled: true })
          .eq('id', userId)

        if (disableError) {
          return APIErrorHandler.handleDatabaseError('ADMIN_USERS_DISABLE', disableError, { userId, action: 'disable' })
        }

        // CRITICAL SECURITY: Sign out the user to invalidate all active sessions
        try {
          await adminClient.auth.admin.signOut(userId)
          console.log(`✅ User ${userId} disabled and signed out successfully`)
        } catch (signOutError) {
          console.error(`⚠️ Failed to sign out user ${userId}:`, signOutError)
          // Continue even if signOut fails - profile is already disabled
        }

        return APIErrorHandler.createSuccessResponse(null, 'User disabled and signed out')

      case 'enable':
        // Check permission to modify
        const enableCheck = canModifyUser(
          currentUser.email,
          currentUser.role,
          targetUser.email,
          targetUser.role
        )
        if (!enableCheck.allowed) {
          return NextResponse.json({ error: enableCheck.reason }, { status: 403 })
        }

        const { error: enableError } = await adminClient
          .from('profiles')
          .update({ is_disabled: false })
          .eq('id', userId)

        if (enableError) {
          return APIErrorHandler.handleDatabaseError('ADMIN_USERS_ENABLE', enableError, { userId, action: 'enable' })
        }
        return APIErrorHandler.createSuccessResponse(null, 'User enabled')

      case 'delete':
        // SUPER ADMIN PROTECTION: Cannot delete Super Admin
        if (targetIsSuperAdmin) {
          return NextResponse.json({
            error: 'Super Admin accounts cannot be deleted. This role is immutable.'
          }, { status: 403 })
        }

        // Check permission to delete
        const deleteCheck = canDeleteUser(
          currentUser.email,
          currentUser.role,
          targetUser.email,
          targetUser.role
        )
        if (!deleteCheck.allowed) {
          return NextResponse.json({ error: deleteCheck.reason }, { status: 403 })
        }

        const { error: deleteError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (deleteError) {
          return APIErrorHandler.handleDatabaseError('ADMIN_USERS_DELETE', deleteError, { userId, action: 'delete' })
        }
        return APIErrorHandler.createSuccessResponse(null, 'User deleted')

      default:
        return APIErrorHandler.handleValidationError('ADMIN_USERS_POST', 'Invalid action provided', { action, userId })
    }
  } catch (error) {
    return APIErrorHandler.handleGenericError('ADMIN_USERS_POST', error)
  }
}