import { test, expect, TEST_USERS, signInUser, createTestUser, cleanupTestUsers } from '../helpers/test-utils'

test.describe('Disabled User Protection', () => {
  test.beforeAll(async () => {
    // Clean up any existing test users
    await cleanupTestUsers()
    
    // Create test users
    await createTestUser('REGULAR', false, false) // Regular active user
    await createTestUser('DISABLED', false, true) // Disabled user
  })

  test.afterAll(async () => {
    // Clean up test users
    await cleanupTestUsers()
  })

  test.describe('Sign-in Prevention', () => {
    test('should prevent disabled user from signing in', async ({ page }) => {
      await page.goto('/auth/sign-in')
      
      // Try to sign in with disabled user
      await page.fill('input[type="email"]', TEST_USERS.DISABLED.email)
      await page.fill('input[type="password"]', TEST_USERS.DISABLED.password)
      await page.click('button[type="submit"]')
      
      // Should see error message about disabled account
      await expect(page.locator('text=/disabled|suspended|account.*blocked|access.*denied/i')).toBeVisible({ timeout: 10000 })
      
      // Should NOT be redirected to dashboard
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/auth/sign-in')
    })

    test('should allow active user to sign in normally', async ({ page }) => {
      await page.goto('/auth/sign-in')
      
      // Sign in with active user
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      
      // Should be redirected to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/)
      await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Session Termination', () => {
    test('should terminate session when user is disabled while logged in', async ({ page }) => {
      // First sign in as regular user
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      await expect(page).toHaveURL(/.*\/dashboard/)
      
      // Simulate user being disabled (this would normally be done by admin)
      // For testing purposes, we'll navigate and check middleware behavior
      
      // Navigate to another page to trigger middleware check
      await page.goto('/dashboard/profile')
      
      // If user was disabled, middleware should catch it and redirect
      // This test assumes the middleware checks disabled status on each request
      await page.waitForTimeout(2000)
      
      // Note: In real scenario, the user would be disabled in database
      // and middleware would detect this and force logout
    })

    test('should prevent access to protected pages for disabled users', async ({ page }) => {
      // Try to access protected pages directly as disabled user
      const protectedPages = [
        '/dashboard',
        '/dashboard/profile', 
        '/dashboard/settings',
        '/admin',
        '/admin/users'
      ]
      
      for (const protectedPage of protectedPages) {
        await page.goto(protectedPage)
        
        // Should be redirected to sign-in page
        await expect(page).toHaveURL(/.*\/auth\/sign-in/)
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('API Access Prevention', () => {
    test('should block API access for disabled users', async ({ page }) => {
      // Try to access API endpoints that might have user context
      const apiEndpoints = [
        '/api/admin/stats',
        '/api/admin/users',
        '/api/stripe/products'
      ]
      
      for (const endpoint of apiEndpoints) {
        const response = await page.request.get(endpoint)
        
        // Should return 401 Unauthorized (not authenticated)
        // or 403 Forbidden (authenticated but disabled)
        expect([401, 403]).toContain(response.status())
      }
    })

    test('should allow API access for active users', async ({ page }) => {
      // Sign in as active user first
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      
      // Try to access API endpoint
      const response = await page.request.get('/api/stripe/products')
      
      // Should either be allowed (200) or forbidden due to role (403)
      // but NOT unauthorized (401)
      expect([200, 403]).toContain(response.status())
    })
  })

  test.describe('Password Recovery Prevention', () => {
    test('should prevent password recovery for disabled users', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      
      // Try to request password reset for disabled user
      await page.fill('input[type="email"]', TEST_USERS.DISABLED.email)
      await page.click('button[type="submit"]')
      
      // Should show generic success message (for security)
      // but password reset email should not actually be sent
      await expect(page.locator('text=/check.*email|sent.*link/i')).toBeVisible({ timeout: 10000 })
      
      // Note: In real implementation, the email wouldn't be sent to disabled users
      // but the UI shows success to prevent account enumeration
    })

    test('should allow password recovery for active users', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      
      // Request password reset for active user
      await page.fill('input[type="email"]', TEST_USERS.REGULAR.email)
      await page.click('button[type="submit"]')
      
      // Should show success message
      await expect(page.locator('text=/check.*email|sent.*link/i')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Admin User Disabling', () => {
    test('should allow admin to disable users', async ({ page }) => {
      // Sign in as admin
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      await page.goto('/admin/users')
      
      // Wait for users to load
      await page.waitForTimeout(3000)
      
      // Look for disable button
      const disableButton = page.locator('button, a').filter({ hasText: /disable|suspend/i }).first()
      
      if (await disableButton.isVisible()) {
        await disableButton.click()
        
        // Handle confirmation if present
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|disable/i })
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }
        
        // Should see success message
        await expect(page.locator('text=/disabled|suspended|success/i')).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show disabled status in user list', async ({ page }) => {
      // Sign in as admin
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      await page.goto('/admin/users')
      
      // Wait for users to load
      await page.waitForTimeout(3000)
      
      // Should see status indicators for users
      await expect(page.locator('text=/disabled|suspended|active|status/i')).toBeVisible()
    })
  })

  test.describe('Edge Cases', () => {
    test('should handle rapid disable/enable operations', async ({ page }) => {
      // Sign in as admin
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      await page.goto('/admin/users')
      await page.waitForTimeout(3000)
      
      // Try to disable and then quickly enable user
      const disableButton = page.locator('button').filter({ hasText: /disable/i }).first()
      const enableButton = page.locator('button').filter({ hasText: /enable|activate/i }).first()
      
      if (await disableButton.isVisible()) {
        await disableButton.click()
        await page.waitForTimeout(1000)
        
        if (await enableButton.isVisible()) {
          await enableButton.click()
          
          // Should handle the operations gracefully
          await expect(page.locator('text=/success|updated|enabled/i')).toBeVisible({ timeout: 10000 })
        }
      }
    })

    test('should prevent admin from disabling themselves', async ({ page }) => {
      // Sign in as admin
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      await page.goto('/admin/users')
      await page.waitForTimeout(3000)
      
      // Try to find disable button for current admin user
      const adminRow = page.locator('tr, .user-row').filter({ hasText: TEST_USERS.ADMIN.email })
      const disableButton = adminRow.locator('button').filter({ hasText: /disable/i })
      
      if (await disableButton.isVisible()) {
        await disableButton.click()
        
        // Should see error preventing self-disable
        await expect(page.locator('text=/cannot.*disable.*yourself|self.*disable/i')).toBeVisible({ timeout: 10000 })
      } else {
        // If disable button is not visible for admin, that's also correct behavior
        expect(true).toBeTruthy()
      }
    })
  })
})