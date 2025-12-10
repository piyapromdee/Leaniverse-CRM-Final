import { test as base, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Test users for different scenarios
export const TEST_USERS = {
  REGULAR: {
    email: 'test.user@example.com',
    password: 'test123456',
    name: 'Test User'
  },
  ADMIN: {
    email: 'admin.test@example.com', 
    password: 'admin123456',
    name: 'Admin User'
  },
  DISABLED: {
    email: 'disabled.user@example.com',
    password: 'disabled123456', 
    name: 'Disabled User'
  }
}

// Helper to create Supabase admin client for test setup
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Clean up test users before/after tests
export async function cleanupTestUsers() {
  const supabase = getSupabaseAdmin()
  
  for (const user of Object.values(TEST_USERS)) {
    try {
      // Delete from auth
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const existingUser = authUsers.users.find(u => u.email === user.email)
      if (existingUser) {
        await supabase.auth.admin.deleteUser(existingUser.id)
      }
    } catch (error) {
      console.log(`Cleanup failed for ${user.email}:`, error)
    }
  }
}

// Create test user with specific role
export async function createTestUser(userType: keyof typeof TEST_USERS, isAdmin = false, isDisabled = false) {
  const supabase = getSupabaseAdmin()
  const user = TEST_USERS[userType]
  
  try {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    })
    
    if (authError) throw authError
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: user.email,
        full_name: user.name,
        role: isAdmin ? 'admin' : 'user',
        disabled: isDisabled
      })
    
    if (profileError) throw profileError
    
    return authUser.user
  } catch (error) {
    console.error(`Failed to create test user ${user.email}:`, error)
    throw error
  }
}

// Helper to sign in a user through the UI
export async function signInUser(page: Page, email: string, password: string) {
  await page.goto('/auth/sign-in')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
}

// Helper to sign out user
export async function signOutUser(page: Page) {
  // Navigate to dashboard first
  await page.goto('/dashboard')
  
  // Look for sign out button in dashboard layout
  const signOutButton = page.locator('[data-testid="sign-out-button"]')
  if (await signOutButton.isVisible()) {
    await signOutButton.click()
  } else {
    // Fallback: clear localStorage and cookies
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.context().clearCookies()
  }
}

// Helper to check if user is on expected page
export async function expectToBeOnPage(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`.*${path}.*`))
}

// Helper to wait for element to be visible
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

// Extended test with cleanup hooks
export const test = base.extend({
  // Auto cleanup after each test
  page: async ({ page }, use) => {
    await use(page)
    // Sign out after each test to ensure clean state
    try {
      await signOutUser(page)
    } catch (error) {
      console.log('Cleanup sign out failed:', error)
    }
  }
})

export { expect }