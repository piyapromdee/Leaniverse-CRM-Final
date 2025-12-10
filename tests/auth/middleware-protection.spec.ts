import { test, expect, TEST_USERS, signInUser, signOutUser, expectToBeOnPage } from '../helpers/test-utils'

test.describe('Route Protection Middleware', () => {
  test.describe('Unauthenticated User Access', () => {
    test('should allow access to public pages', async ({ page }) => {
      // Test landing page
      await page.goto('/')
      await expect(page).toHaveURL('/')
      
      // Test auth pages
      await page.goto('/auth/sign-in')
      await expect(page).toHaveURL(/.*\/auth\/sign-in/)
      
      await page.goto('/auth/sign-up')
      await expect(page).toHaveURL(/.*\/auth\/sign-up/)
      
      await page.goto('/auth/forgot-password')
      await expect(page).toHaveURL(/.*\/auth\/forgot-password/)
      
      await page.goto('/auth/reset-password')
      await expect(page).toHaveURL(/.*\/auth\/reset-password/)
    })

    test('should redirect from protected dashboard to sign-in', async ({ page }) => {
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/auth/sign-in')
    })

    test('should redirect from protected admin to sign-in', async ({ page }) => {
      await page.goto('/admin')
      await expectToBeOnPage(page, '/auth/sign-in')
    })

    test('should redirect from admin sub-pages to sign-in', async ({ page }) => {
      await page.goto('/admin/users')
      await expectToBeOnPage(page, '/auth/sign-in')
      
      await page.goto('/admin/settings')
      await expectToBeOnPage(page, '/auth/sign-in')
      
      await page.goto('/admin/stripe')
      await expectToBeOnPage(page, '/auth/sign-in')
    })

    test('should redirect from dashboard sub-pages to sign-in', async ({ page }) => {
      await page.goto('/dashboard/profile')
      await expectToBeOnPage(page, '/auth/sign-in')
      
      await page.goto('/dashboard/settings')
      await expectToBeOnPage(page, '/auth/sign-in')
    })
  })

  test.describe('Regular User Access', () => {
    test.beforeEach(async ({ page }) => {
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
    })

    test('should allow access to dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/dashboard')
      
      // Should see dashboard content
      await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 })
    })

    test('should allow access to dashboard sub-pages', async ({ page }) => {
      await page.goto('/dashboard/profile')
      await expectToBeOnPage(page, '/dashboard/profile')
      
      await page.goto('/dashboard/settings')
      await expectToBeOnPage(page, '/dashboard/settings')
    })

    test('should be blocked from admin pages', async ({ page }) => {
      await page.goto('/admin')
      
      // Should either be redirected or see unauthorized message
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
      
      expect(currentUrl.includes('/admin') === false || hasUnauthorizedText).toBeTruthy()
    })

    test('should be blocked from admin sub-pages', async ({ page }) => {
      const adminPages = ['/admin/users', '/admin/settings', '/admin/stripe']
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage)
        await page.waitForTimeout(2000)
        
        const currentUrl = page.url()
        const hasUnauthorizedText = await page.locator('text=/unauthorized|forbidden|access.*denied/i').isVisible()
        
        expect(currentUrl.includes(adminPage) === false || hasUnauthorizedText).toBeTruthy()
      }
    })

    test('should redirect from auth pages to dashboard', async ({ page }) => {
      await page.goto('/auth/sign-in')
      await expectToBeOnPage(page, '/dashboard')
      
      await page.goto('/auth/sign-up')
      await expectToBeOnPage(page, '/dashboard')
    })
  })

  test.describe('Admin User Access', () => {
    test.beforeEach(async ({ page }) => {
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
    })

    test('should allow access to dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/dashboard')
    })

    test('should allow access to admin pages', async ({ page }) => {
      await page.goto('/admin')
      await expectToBeOnPage(page, '/admin')
      
      // Should see admin content
      await expect(page.locator('text=/admin|dashboard|statistics/i')).toBeVisible({ timeout: 10000 })
    })

    test('should allow access to admin sub-pages', async ({ page }) => {
      const adminPages = [
        '/admin/users',
        '/admin/settings', 
        '/admin/stripe',
        '/admin/stripe/products'
      ]
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage)
        await expectToBeOnPage(page, adminPage)
        
        // Should see some admin content
        await expect(page.locator('text=/admin|management|settings/i')).toBeVisible({ timeout: 5000 })
      }
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
  })

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      await expectToBeOnPage(page, '/dashboard')
      
      // Reload page
      await page.reload()
      await expectToBeOnPage(page, '/dashboard')
      
      // Navigate to another protected page
      await page.goto('/dashboard/profile')
      await expectToBeOnPage(page, '/dashboard/profile')
    })

    test('should redirect to sign-in after sign out', async ({ page }) => {
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      await expectToBeOnPage(page, '/dashboard')
      
      // Sign out
      await signOutUser(page)
      
      // Try to access protected page
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/auth/sign-in')
    })

    test('should handle invalid/expired sessions', async ({ page }) => {
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      await expectToBeOnPage(page, '/dashboard')
      
      // Manually clear auth cookies/tokens
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.context().clearCookies()
      
      // Try to access protected page
      await page.goto('/dashboard')
      await expectToBeOnPage(page, '/auth/sign-in')
    })
  })

  test.describe('API Route Protection', () => {
    test('should block unauthorized API access', async ({ page }) => {
      // Test admin API endpoints
      const response1 = await page.request.get('/api/admin/stats')
      expect(response1.status()).toBe(401)
      
      const response2 = await page.request.get('/api/admin/users')
      expect(response2.status()).toBe(401)
      
      // Test Stripe API endpoints
      const response3 = await page.request.get('/api/stripe/products')
      expect(response3.status()).toBe(401)
    })

    test('should allow authorized API access for regular users', async ({ page }) => {
      await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
      
      // Regular users should be able to access some endpoints
      // but specific ones depend on your API design
      const response = await page.request.get('/api/stripe/products')
      
      // Should either be allowed (200) or forbidden (403), not unauthorized (401)
      expect([200, 403]).toContain(response.status())
    })

    test('should allow admin API access for admin users', async ({ page }) => {
      await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
      
      // Admin should be able to access admin endpoints
      const response1 = await page.request.get('/api/admin/stats')
      expect(response1.status()).toBe(200)
      
      const response2 = await page.request.get('/api/admin/users')
      expect(response2.status()).toBe(200)
    })
  })
})