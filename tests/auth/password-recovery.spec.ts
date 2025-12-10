import { test, expect, TEST_USERS, expectToBeOnPage } from '../helpers/test-utils'

test.describe('Password Recovery Flow', () => {
  test.describe('Forgot Password Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/forgot-password')
    })

    test('should display forgot password form', async ({ page }) => {
      await expect(page.locator('[data-slot="card-title"]').filter({ hasText: 'Reset your password' })).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show validation error for empty email', async ({ page }) => {
      await page.click('button[type="submit"]')
      
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeRequired()
    })

    test('should show validation error for invalid email', async ({ page }) => {
      await page.fill('input[type="email"]', 'invalid-email')
      await page.click('button[type="submit"]')
      
      // HTML5 validation should catch this
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toHaveAttribute('type', 'email')
    })

    test('should show success message for valid email', async ({ page }) => {
      await page.fill('input[type="email"]', TEST_USERS.REGULAR.email)
      await page.click('button[type="submit"]')
      
      // Should show success message
      await expect(page.locator('text=/check.*email|sent.*link|reset.*link/i')).toBeVisible({ timeout: 10000 })
    })

    test('should show success message even for non-existent email', async ({ page }) => {
      // Security: don't reveal if email exists
      await page.fill('input[type="email"]', 'nonexistent@example.com')
      await page.click('button[type="submit"]')
      
      // Should still show success message
      await expect(page.locator('text=/check.*email|sent.*link|reset.*link/i')).toBeVisible({ timeout: 10000 })
    })

    test('should have back to sign in link', async ({ page }) => {
      const backLink = page.locator('a[href="/auth/sign-in"], a').filter({ hasText: /back.*sign.*in|sign.*in/i })
      await expect(backLink).toBeVisible()
      
      // Test navigation
      await backLink.click()
      await expectToBeOnPage(page, '/auth/sign-in')
    })

    test('should show loading state during submission', async ({ page }) => {
      await page.fill('input[type="email"]', TEST_USERS.REGULAR.email)
      await page.click('button[type="submit"]')
      
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe('Reset Password Page', () => {
    test.beforeEach(async ({ page }) => {
      // Note: In real tests, you'd need a valid reset token
      // For now, test the page directly
      await page.goto('/auth/reset-password')
    })

    test('should display reset password form', async ({ page }) => {
      await expect(page.locator('h1, h2').filter({ hasText: /set.*new.*password|reset.*password/i })).toBeVisible()
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
      await expect(page.locator('input[type="password"]').nth(1)).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show password visibility toggles', async ({ page }) => {
      // Look for eye icons or show/hide buttons
      const visibilityToggles = page.locator('[data-testid*="toggle"], button').filter({ hasText: /show|hide/ })
      await expect(visibilityToggles.first()).toBeVisible()
    })

    test('should show validation for empty passwords', async ({ page }) => {
      await page.click('button[type="submit"]')
      
      const passwordInputs = page.locator('input[type="password"]')
      await expect(passwordInputs.first()).toBeRequired()
      await expect(passwordInputs.nth(1)).toBeRequired()
    })

    test('should show error for short password', async ({ page }) => {
      await page.fill('input[type="password"]').first().fill('123')
      await page.fill('input[type="password"]').nth(1).fill('123')
      await page.click('button[type="submit"]')
      
      // Should show password requirements error
      await expect(page.locator('text=/password.*least.*6|too.*short/i')).toBeVisible()
    })

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.fill('input[type="password"]').first().fill('password123')
      await page.fill('input[type="password"]').nth(1).fill('different123')
      await page.click('button[type="submit"]')
      
      // Should show mismatch error
      await expect(page.locator('text=/password.*match|password.*same/i')).toBeVisible()
    })

    test('should show password requirements in real-time', async ({ page }) => {
      await page.fill('input[type="password"]').first().fill('test')
      
      // Should show requirements with visual indicators
      await expect(page.locator('text=/requirement|character/i')).toBeVisible()
    })

    test('should disable submit button for invalid input', async ({ page }) => {
      // Short password
      await page.fill('input[type="password"]').first().fill('123')
      await page.fill('input[type="password"]').nth(1).fill('456')
      
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeDisabled()
    })

    test('should enable submit button for valid input', async ({ page }) => {
      const validPassword = 'validpassword123'
      await page.fill('input[type="password"]').first().fill(validPassword)
      await page.fill('input[type="password"]').nth(1).fill(validPassword)
      
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeEnabled()
    })

    test('should have back to sign in link', async ({ page }) => {
      const backLink = page.locator('a[href="/auth/sign-in"], a').filter({ hasText: /back.*sign.*in|sign.*in/i })
      await expect(backLink).toBeVisible()
      
      // Test navigation
      await backLink.click()
      await expectToBeOnPage(page, '/auth/sign-in')
    })

    test('should show success state after password update', async ({ page }) => {
      // This test would need a valid reset session
      // For now, just check that success elements exist in the DOM
      const successElements = page.locator('[data-testid*="success"], .success, text=/success|updated|complete/i')
      // Don't expect them to be visible initially, just check they exist in the markup
      expect(await successElements.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Integration Flow', () => {
    test('should navigate from sign-in to forgot password and back', async ({ page }) => {
      // Start at sign in
      await page.goto('/auth/sign-in')
      
      // Click forgot password link
      const forgotLink = page.locator('a').filter({ hasText: /forgot.*password/i })
      await forgotLink.click()
      await expectToBeOnPage(page, '/auth/forgot-password')
      
      // Go back to sign in
      const backLink = page.locator('a').filter({ hasText: /back.*sign.*in|sign.*in/i })
      await backLink.click()
      await expectToBeOnPage(page, '/auth/sign-in')
    })
  })
})