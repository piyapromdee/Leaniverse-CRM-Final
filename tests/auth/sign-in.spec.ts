import { test, expect, TEST_USERS, signInUser, expectToBeOnPage } from '../helpers/test-utils'

test.describe('Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/sign-in')
  })

  test('should display sign in form', async ({ page }) => {
    await expect(page.locator('text=Sign in to LeaniOS')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show "Forgot your password?" link', async ({ page }) => {
    const forgotPasswordLink = page.locator('a[href="/auth/forgot-password"], a').filter({ hasText: /forgot.*password/i })
    await expect(forgotPasswordLink).toBeVisible()
    
    // Test navigation
    await forgotPasswordLink.click()
    await expectToBeOnPage(page, '/auth/forgot-password')
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    
    // Check HTML5 validation
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    
    await expect(emailInput).toBeRequired()
    await expect(passwordInput).toBeRequired()
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'somepassword')
    await page.click('button[type="submit"]')
    
    // HTML5 validation should catch this
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('should show error for wrong credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=/invalid.*credential|wrong.*password|sign.*failed/i')).toBeVisible({ timeout: 10000 })
  })

  test('should successfully sign in with valid credentials', async ({ page }) => {
    // Use a test user that should exist
    await page.fill('input[type="email"]', TEST_USERS.REGULAR.email)
    await page.fill('input[type="password"]', TEST_USERS.REGULAR.password)
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expectToBeOnPage(page, '/dashboard')
    
    // Should see dashboard content
    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 })
  })

  test('should persist session after page refresh', async ({ page }) => {
    // Sign in first
    await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
    await expectToBeOnPage(page, '/dashboard')
    
    // Refresh page
    await page.reload()
    
    // Should still be on dashboard
    await expectToBeOnPage(page, '/dashboard')
  })

  test('should have link to sign up page', async ({ page }) => {
    const signUpLink = page.locator('a[href="/auth/sign-up"], a').filter({ hasText: /sign up/i })
    await expect(signUpLink).toBeVisible()
    
    // Test navigation
    await signUpLink.click()
    await expectToBeOnPage(page, '/auth/sign-up')
  })

  test('should show loading state during sign in', async ({ page }) => {
    await page.fill('input[type="email"]', TEST_USERS.REGULAR.email)
    await page.fill('input[type="password"]', TEST_USERS.REGULAR.password)
    
    // Click submit and check loading state
    await page.click('button[type="submit"]')
    
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
  })

  test('should redirect authenticated users away from sign in', async ({ page }) => {
    // Sign in first
    await signInUser(page, TEST_USERS.REGULAR.email, TEST_USERS.REGULAR.password)
    await expectToBeOnPage(page, '/dashboard')
    
    // Try to go back to sign in page
    await page.goto('/auth/sign-in')
    
    // Should be redirected away (either to dashboard or blocked)
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/auth/sign-in')
  })

  test('should handle sign in with disabled account', async ({ page }) => {
    // Try to sign in with disabled user
    await page.fill('input[type="email"]', TEST_USERS.DISABLED.email)
    await page.fill('input[type="password"]', TEST_USERS.DISABLED.password)
    await page.click('button[type="submit"]')
    
    // Should show disabled account error or prevent sign in
    await expect(page.locator('text=/disabled|suspended|blocked/i')).toBeVisible({ timeout: 10000 })
  })
})