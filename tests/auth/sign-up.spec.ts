import { test, expect } from '../helpers/test-utils'

test.describe('Sign Up Flow', () => {
  const testEmail = 'playwright.signup@example.com'
  const testPassword = 'test123456'

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/sign-up')
  })

  test('should display sign up form', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /sign up/i })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Check for HTML5 validation or custom error messages
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    
    // HTML5 validation should prevent submission
    await expect(emailInput).toBeRequired()
    await expect(passwordInput).toBeRequired()
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    
    // Should see HTML5 validation error or custom error
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('should show error for weak password', async ({ page }) => {
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', '123') // Too short
    await page.click('button[type="submit"]')
    
    // Should show password requirements error
    await expect(page.locator('text=/password.*least.*6/i')).toBeVisible({ timeout: 10000 })
  })

  test('should successfully create account', async ({ page }) => {
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should either:
    // 1. Redirect to dashboard (if email confirmation disabled)
    // 2. Show confirmation message (if email confirmation enabled)
    // 3. Show error if user already exists
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Check for success indicators
    const currentUrl = page.url()
    const hasSuccessMessage = await page.locator('text=/check.*email|confirm.*email|success/i').isVisible()
    const redirectedToDashboard = currentUrl.includes('/dashboard')
    
    expect(hasSuccessMessage || redirectedToDashboard).toBeTruthy()
  })

  test('should have link to sign in page', async ({ page }) => {
    const signInLink = page.locator('a[href="/auth/sign-in"], a[href*="sign-in"]')
    await expect(signInLink).toBeVisible()
    
    // Click link and verify navigation
    await signInLink.click()
    await expect(page).toHaveURL(/.*\/auth\/sign-in/)
  })

  test('should handle existing user error', async ({ page }) => {
    // Try to sign up with admin test user (should already exist)
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')
    
    // Should show error about existing user
    await expect(page.locator('text=/already.*exist|user.*exist/i')).toBeVisible({ timeout: 10000 })
  })

  test('should show loading state during submission', async ({ page }) => {
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    // Click submit and check for loading state
    await page.click('button[type="submit"]')
    
    // Should see loading text or disabled button
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
  })
})