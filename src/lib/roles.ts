/**
 * Role Definitions and Permissions System
 *
 * This file defines the role hierarchy and permissions for the CRM system.
 * The SUPER_ADMIN role is immutable and cannot be modified by any user.
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',  // Owner/Super Admin - immutable, full permissions
  ADMIN: 'admin',              // Administrator - can manage most things
  OWNER: 'owner',              // Business owner - financial access
  SALES: 'sales',              // Sales representative
  USER: 'user',                // General user
} as const

export type RoleType = typeof ROLES[keyof typeof ROLES]

// ============================================================================
// SUPER ADMIN CONFIGURATION
// ============================================================================

/**
 * SUPER ADMIN / OWNER CONFIGURATION
 *
 * The Super Admin is the highest level of access in the system.
 * This role CANNOT be:
 * - Deleted
 * - Demoted
 * - Have permissions revoked
 * - Be disabled by other admins
 *
 * Only the Super Admin can:
 * - Assign/remove Super Admin role to other users
 * - Access all system configurations
 * - Delete other admins
 */

// Hardcoded Super Admin email - This user will always have Super Admin privileges
// This should be the primary system owner's email
export const SUPER_ADMIN_EMAILS = [
  'dummiandco@gmail.com',   // Primary Super Admin / Owner
] as const

// Role display names for UI
export const ROLE_DISPLAY_NAMES: Record<RoleType, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.OWNER]: 'Owner',
  [ROLES.SALES]: 'Sales',
  [ROLES.USER]: 'User',
}

// Role badge colors for UI
export const ROLE_BADGE_COLORS: Record<RoleType, string> = {
  [ROLES.SUPER_ADMIN]: 'bg-purple-600 text-white',
  [ROLES.ADMIN]: 'bg-blue-600 text-white',
  [ROLES.OWNER]: 'bg-green-600 text-white',
  [ROLES.SALES]: 'bg-gray-600 text-white',
  [ROLES.USER]: 'bg-gray-400 text-white',
}

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS = {
  // User Management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',
  USERS_MANAGE_SUPER_ADMIN: 'users:manage_super_admin',

  // Lead Management
  LEADS_READ: 'leads:read',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',
  LEADS_ASSIGN: 'leads:assign',
  LEADS_REASSIGN: 'leads:reassign',

  // Deal Management
  DEALS_READ: 'deals:read',
  DEALS_CREATE: 'deals:create',
  DEALS_UPDATE: 'deals:update',
  DEALS_DELETE: 'deals:delete',

  // Contact Management
  CONTACTS_READ: 'contacts:read',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',

  // Task Management
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',

  // Product Management
  PRODUCTS_READ: 'products:read',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',

  // Transaction Management
  TRANSACTIONS_READ: 'transactions:read',
  TRANSACTIONS_CREATE: 'transactions:create',
  TRANSACTIONS_UPDATE: 'transactions:update',
  TRANSACTIONS_DELETE: 'transactions:delete',

  // Email Management
  EMAILS_READ: 'emails:read',
  EMAILS_SEND: 'emails:send',
  EMAILS_TEMPLATES: 'emails:templates',
  EMAILS_MARKETING: 'emails:marketing',

  // Quotation System
  QUOTES_READ: 'quotes:read',
  QUOTES_CREATE: 'quotes:create',
  QUOTES_UPDATE: 'quotes:update',
  QUOTES_DELETE: 'quotes:delete',
  QUOTES_SEND: 'quotes:send',

  // Reports & Analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_VIEW: 'analytics:view',

  // System Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_INTEGRATIONS: 'settings:integrations',

  // Admin Dashboard
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_FULL_ACCESS: 'admin:full_access',
} as const

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// ============================================================================
// ROLE PERMISSION MAPPING
// ============================================================================

/**
 * Permissions assigned to each role
 * Super Admin has ALL permissions automatically
 */
export const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // ALL permissions

  [ROLES.ADMIN]: [
    // User Management (except Super Admin management)
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE_ROLES,
    // All CRM permissions
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.LEADS_DELETE,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.LEADS_REASSIGN,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_UPDATE,
    PERMISSIONS.DEALS_DELETE,
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_CREATE,
    PERMISSIONS.CONTACTS_UPDATE,
    PERMISSIONS.CONTACTS_DELETE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.TRANSACTIONS_CREATE,
    PERMISSIONS.TRANSACTIONS_UPDATE,
    PERMISSIONS.TRANSACTIONS_DELETE,
    PERMISSIONS.EMAILS_READ,
    PERMISSIONS.EMAILS_SEND,
    PERMISSIONS.EMAILS_TEMPLATES,
    PERMISSIONS.EMAILS_MARKETING,
    PERMISSIONS.QUOTES_READ,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.QUOTES_UPDATE,
    PERMISSIONS.QUOTES_DELETE,
    PERMISSIONS.QUOTES_SEND,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.ADMIN_DASHBOARD,
  ],

  [ROLES.OWNER]: [
    // OWNER / SUPER ADMIN - Full administrative access
    // User Management
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE_ROLES,
    PERMISSIONS.USERS_MANAGE_SUPER_ADMIN,
    // Sales Results (Read-only for oversight)
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.CONTACTS_READ,
    // Note: Owner does NOT have Tasks permissions (operational exclusion)
    // Products & Transactions (Full access)
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.TRANSACTIONS_CREATE,
    PERMISSIONS.TRANSACTIONS_UPDATE,
    PERMISSIONS.TRANSACTIONS_DELETE,
    // Email System (Full access)
    PERMISSIONS.EMAILS_READ,
    PERMISSIONS.EMAILS_SEND,
    PERMISSIONS.EMAILS_TEMPLATES,
    PERMISSIONS.EMAILS_MARKETING,
    // Quotations (Full access)
    PERMISSIONS.QUOTES_READ,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.QUOTES_UPDATE,
    PERMISSIONS.QUOTES_DELETE,
    PERMISSIONS.QUOTES_SEND,
    // Reports & Analytics
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
    // System Settings (Full access)
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SETTINGS_INTEGRATIONS,
    // Admin Dashboard
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_FULL_ACCESS,
  ],

  [ROLES.SALES]: [
    // Limited CRM access
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_UPDATE,
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_CREATE,
    PERMISSIONS.CONTACTS_UPDATE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.QUOTES_READ,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.QUOTES_UPDATE,
    PERMISSIONS.QUOTES_SEND,
    PERMISSIONS.EMAILS_READ,
    PERMISSIONS.EMAILS_SEND,
  ],

  [ROLES.USER]: [
    // Minimal access
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.CONTACTS_READ,
  ],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an email belongs to a Super Admin
 */
export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase() as any)
}

/**
 * Check if a role is Super Admin
 */
export function isSuperAdminRole(role: string): boolean {
  return role === ROLES.SUPER_ADMIN
}

/**
 * Check if a user (by email) is a Super Admin
 * This is the primary check for Super Admin status
 */
export function isUserSuperAdmin(email: string | undefined | null, role?: string): boolean {
  if (!email) return false
  // Check email-based Super Admin (hardcoded)
  if (isSuperAdminEmail(email)) return true
  // Check role-based Super Admin
  if (role && isSuperAdminRole(role)) return true
  return false
}

/**
 * Check if a user has admin-level access (Admin or Super Admin)
 */
export function hasAdminAccess(role: string | undefined | null, email?: string): boolean {
  if (!role) return false
  if (email && isUserSuperAdmin(email, role)) return true
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: RoleType, permission: PermissionType): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions?.includes(permission) ?? false
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: RoleType): PermissionType[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if a target user can be modified by the acting user
 * Super Admins cannot be modified by regular admins
 */
export function canModifyUser(
  actingUserEmail: string,
  actingUserRole: string,
  targetUserEmail: string,
  targetUserRole: string
): { allowed: boolean; reason?: string } {
  // Super Admins can modify anyone
  if (isUserSuperAdmin(actingUserEmail, actingUserRole)) {
    return { allowed: true }
  }

  // Regular admins cannot modify Super Admins
  if (isUserSuperAdmin(targetUserEmail, targetUserRole)) {
    return {
      allowed: false,
      reason: 'Super Admin accounts cannot be modified by regular administrators'
    }
  }

  // Regular admins can modify non-Super Admin users
  if (hasAdminAccess(actingUserRole, actingUserEmail)) {
    return { allowed: true }
  }

  return { allowed: false, reason: 'Insufficient permissions' }
}

/**
 * Check if a user can change another user's role
 */
export function canChangeRole(
  actingUserEmail: string,
  actingUserRole: string,
  targetUserEmail: string,
  targetUserRole: string,
  newRole: string
): { allowed: boolean; reason?: string } {
  // Only Super Admins can assign/remove Super Admin role
  if (newRole === ROLES.SUPER_ADMIN || targetUserRole === ROLES.SUPER_ADMIN) {
    if (!isUserSuperAdmin(actingUserEmail, actingUserRole)) {
      return {
        allowed: false,
        reason: 'Only Super Admins can manage Super Admin roles'
      }
    }
  }

  // Check general modification permissions
  return canModifyUser(actingUserEmail, actingUserRole, targetUserEmail, targetUserRole)
}

/**
 * Check if a user can be deleted
 */
export function canDeleteUser(
  actingUserEmail: string,
  actingUserRole: string,
  targetUserEmail: string,
  targetUserRole: string
): { allowed: boolean; reason?: string } {
  // Super Admins cannot be deleted (even by other Super Admins)
  if (isUserSuperAdmin(targetUserEmail, targetUserRole)) {
    return {
      allowed: false,
      reason: 'Super Admin accounts cannot be deleted'
    }
  }

  // Check general modification permissions
  return canModifyUser(actingUserEmail, actingUserRole, targetUserEmail, targetUserRole)
}

/**
 * Check if a user can be disabled
 */
export function canDisableUser(
  actingUserEmail: string,
  actingUserRole: string,
  targetUserEmail: string,
  targetUserRole: string
): { allowed: boolean; reason?: string } {
  // Super Admins cannot be disabled
  if (isUserSuperAdmin(targetUserEmail, targetUserRole)) {
    return {
      allowed: false,
      reason: 'Super Admin accounts cannot be disabled'
    }
  }

  // Check general modification permissions
  return canModifyUser(actingUserEmail, actingUserRole, targetUserEmail, targetUserRole)
}

/**
 * Get the effective role for a user (considering email-based Super Admin)
 */
export function getEffectiveRole(email: string | undefined | null, dbRole: string): RoleType {
  if (email && isSuperAdminEmail(email)) {
    return ROLES.SUPER_ADMIN
  }
  return dbRole as RoleType
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string, email?: string): string {
  if (email && isSuperAdminEmail(email)) {
    return ROLE_DISPLAY_NAMES[ROLES.SUPER_ADMIN]
  }
  return ROLE_DISPLAY_NAMES[role as RoleType] || role
}

/**
 * Get badge color for a role
 */
export function getRoleBadgeColor(role: string, email?: string): string {
  if (email && isSuperAdminEmail(email)) {
    return ROLE_BADGE_COLORS[ROLES.SUPER_ADMIN]
  }
  return ROLE_BADGE_COLORS[role as RoleType] || 'bg-gray-400 text-white'
}

/**
 * Get available roles that can be assigned by an admin
 * Super Admin role can only be assigned by Super Admins
 */
export function getAssignableRoles(actingUserEmail: string, actingUserRole: string): RoleType[] {
  const baseRoles: RoleType[] = [ROLES.USER, ROLES.SALES, ROLES.OWNER, ROLES.ADMIN]

  if (isUserSuperAdmin(actingUserEmail, actingUserRole)) {
    return [...baseRoles, ROLES.SUPER_ADMIN]
  }

  return baseRoles
}
