import { test, expect, TEST_USERS, signInUser, signOutUser, expectToBeOnPage } from '../helpers/test-utils'

test.describe('Role-Based Access Control', () => {
  test.describe('Regular User Access Control', () => {
    test.beforeEach(async ({ page }) => {
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
    })

    test('should allow access to user dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/dashboard')
      
      // Should see user dashboard content
      await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible()
    })

    test('should allow access to user profile', async ({ page }) => {
      await page.goto('/dashboard/profile')
      await expectToBeOnPage(page, '/dashboard/profile')
      
      // Should see profile content
      await expect(page.locator('text=/profile|personal.*information/i')).toBeVisible()
    })

    test('should allow access to user settings', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await expectToBeOnPage(page, '/dashboard/settings')
      
      // Should see settings content
      await expect(page.locator('text=/settings|preferences/i')).toBeVisible()
    })

    test('should block access to admin dashboard', async ({ page }) => {
      await page.goto('/admin')
      
      // Should be redirected or see unauthorized message
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
      
      expect(!currentUrl.includes('/admin') || hasUnauthorizedText).toBeTruthy()
    })

    test('should block access to user management', async ({ page }) => {
      await page.goto('/admin/users')
      
      // Should be blocked
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
      
      expect(!currentUrl.includes('/admin/users') || hasUnauthorizedText).toBeTruthy()
    })

    test('should block access to Stripe admin features', async ({ page }) => {
      await page.goto('/admin/stripe')
      
      // Should be blocked
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
      
      expect(!currentUrl.includes('/admin/stripe') || hasUnauthorizedText).toBeTruthy()
    })

    test('should not show admin link in dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Should NOT see admin link
      const adminLink = page.locator('a[href="/admin"], a').filter({ hasText: /admin/i })
      await expect(adminLink).not.toBeVisible()
    })

    test('should block admin API endpoints', async ({ page }) => {
      const adminEndpoints = [
        '/api/admin/stats',
        '/api/admin/users'
      ]
      
      for (const endpoint of adminEndpoints) {
        const response = await page.request.get(endpoint)
        
        // Should return 403 Forbidden (not authorized for this role)
        expect(response.status()).toBe(403)
      }
    })
  })

  test.describe('Admin User Access Control', () => {
    test.beforeEach(async ({ page }) => {
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
    })

    test('should allow access to user dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/dashboard')
      
      // Should see dashboard content
      await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible()
    })

    test('should allow access to admin dashboard', async ({ page }) => {
      await page.goto('/admin')
      await expectToBeOnPage(page, '/admin')
      
      // Should see admin dashboard content
      await expect(page.locator('text=/admin.*dashboard|statistics|overview/i')).toBeVisible()
    })

    test('should allow access to user management', async ({ page }) => {
      await page.goto('/admin/users')
      await expectToBeOnPage(page, '/admin/users')
      
      // Should see user management interface
      await expect(page.locator('text=/user.*management|manage.*users/i')).toBeVisible()
    })

    test('should allow access to Stripe admin features', async ({ page }) => {
      await page.goto('/admin/stripe')
      await expectToBeOnPage(page, '/admin/stripe')
      
      // Should see Stripe integration page
      await expect(page.locator('text=/stripe|payment.*integration/i')).toBeVisible()
    })

    test('should allow access to product management', async ({ page }) => {
      await page.goto('/admin/stripe/products')
      await expectToBeOnPage(page, '/admin/stripe/products')
      
      // Should see product management interface
      await expect(page.locator('text=/products|product.*management/i')).toBeVisible()
    })

    test('should show admin link in dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Should see admin link
      const adminLink = page.locator('a[href="/admin"], a').filter({ hasText: /admin/i })
      await expect(adminLink).toBeVisible()
      
      // Test navigation
      await adminLink.click()
      await expectToBeOnPage(page, '/admin')
    })

    test('should allow access to admin API endpoints', async ({ page }) => {
      const adminEndpoints = [
        '/api/admin/stats',
        '/api/admin/users'
      ]
      
      for (const endpoint of adminEndpoints) {
        const response = await page.request.get(endpoint)
        
        // Should return 200 OK (authorized)
        expect(response.status()).toBe(200)
      }
    })

    test('should allow creating/managing users', async ({ page }) => {
      await page.goto('/admin/users')
      
      // Should see add user functionality
      const addButton = page.locator('button, a').filter({ hasText: /add.*user|create.*user/i })
      await expect(addButton).toBeVisible()
      
      // Should see user action buttons
      const actionButtons = page.locator('button, a').filter({ hasText: /edit|delete|disable|view/i })
      await expect(actionButtons.first()).toBeVisible()
    })

    test('should allow Stripe integration management', async ({ page }) => {
      await page.goto('/admin/stripe')
      
      // Should see Stripe management options
      const stripeActions = page.locator('button, input, form').filter({ hasText: /connect|setup|api.*key|manual/i })
      await expect(stripeActions.first()).toBeVisible()
    })
  })

  test.describe('Role Transition Testing', () => {
    test('should handle role changes correctly', async ({ page }) => {
      // Start as regular user
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      await page.goto('/dashboard')
      
      // Verify no admin access
      const adminLink = page.locator('a[href="/admin"]')
      await expect(adminLink).not.toBeVisible()
      
      // Sign out and sign in as admin
      await signOutUser(page)
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      await page.goto('/dashboard')
      
      // Verify admin access
      const adminLinkAsAdmin = page.locator('a[href="/admin"], a').filter({ hasText: /admin/i })
      await expect(adminLinkAsAdmin).toBeVisible()
    })

    test('should maintain role restrictions after page refresh', async ({ page }) => {
      // Sign in as regular user
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      await page.goto('/dashboard')
      
      // Refresh page
      await page.reload()
      
      // Should still be regular user with no admin access
      await page.goto('/admin')
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
      
      expect(!currentUrl.includes('/admin') || hasUnauthorizedText).toBeTruthy()
    })
  })

  test.describe('Security Edge Cases', () => {
    test('should prevent role escalation via URL manipulation', async ({ page }) => {
      // Sign in as regular user
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      
      // Try various admin URLs directly
      const adminUrls = [
        '/admin',
        '/admin/users',
        '/admin/settings',
        '/admin/stripe',
        '/admin/stripe/products'
      ]
      
      for (const url of adminUrls) {
        await page.goto(url)
        await page.waitForTimeout(2000)
        
        const currentUrl = page.url()
        const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
        
        expect(!currentUrl.includes(url) || hasUnauthorizedText).toBeTruthy()
      }
    })

    test('should prevent API access escalation', async ({ page }) => {
      // Sign in as regular user
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      
      // Try to access admin API endpoints
      const response = await page.request.post('/api/admin/users', {
        data: {
          email: 'test@example.com',
          password: 'password123',
          role: 'admin'
        }
      })
      
      // Should be forbidden
      expect(response.status()).toBe(403)
    })

    test('should handle concurrent sessions with different roles', async ({ browser }) => {
      // Create two browser contexts
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()
      
      // Sign in as regular user in first context
      await signInUser(page1, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      
      // Sign in as admin in second context
      await signInUser(page2, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      
      // Test access in both contexts
      await page1.goto('/admin')
      await page2.goto('/admin')
      
      await page1.waitForTimeout(2000)
      await page2.waitForTimeout(2000)
      
      // Regular user should be blocked
      const url1 = page1.url()
      const hasUnauthorized1 = await page1.locator('text=/unauthorized|forbidden/i').isVisible()
      expect(!url1.includes('/admin') || hasUnauthorized1).toBeTruthy()
      
      // Admin should have access
      const url2 = page2.url()
      expect(url2).toContain('/admin')
      
      await context1.close()
      await context2.close()
    })
  })
})