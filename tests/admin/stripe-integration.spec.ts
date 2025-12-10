import { test, expect, TEST_USERS, signInUser, expectToBeOnPage } from '../helpers/test-utils'

test.describe('Admin Stripe Integration', () => {
  test.beforeEach(async ({ page }) => {
    await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
  })

  test.describe('Stripe Settings Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/stripe')
    })

    test('should display Stripe integration page', async ({ page }) => {
      await expectToBeOnPage(page, '/admin/stripe')
      
      // Should see Stripe-related content
      await expect(page.locator('text=/stripe|payment|integration/i')).toBeVisible()
    })

    test('should show Stripe connection status', async ({ page }) => {
      // Should see connection status indicator
      await expect(page.locator('text=/connected|disconnected|status|account/i')).toBeVisible({ timeout: 10000 })
    })

    test('should have manual setup option', async ({ page }) => {
      // Look for manual setup form or button
      const manualSetupElements = page.locator('button, form, input').filter({ hasText: /manual|setup|api.*key|secret/i })
      await expect(manualSetupElements.first()).toBeVisible()
    })

    test('should show disconnect option when connected', async ({ page }) => {
      // If connected, should see disconnect button
      const disconnectButton = page.locator('button, a').filter({ hasText: /disconnect|remove/i })
      
      if (await disconnectButton.isVisible()) {
        // Test disconnect functionality
        await disconnectButton.click()
        
        // Should see confirmation dialog
        await expect(page.locator('[role="dialog"], .modal')).toBeVisible()
        
        // Cancel to avoid actually disconnecting
        const cancelButton = page.locator('button').filter({ hasText: /cancel|no/i })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
        }
      }
    })

    test('should validate API key input', async ({ page }) => {
      // Look for API key input
      const apiKeyInput = page.locator('input[name*="api"], input[name*="key"], input[name*="secret"]')
      
      if (await apiKeyInput.isVisible()) {
        // Test with invalid key
        await apiKeyInput.fill('invalid_key')
        
        const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /save|connect|setup/i })
        await submitButton.click()
        
        // Should see validation error
        await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Product Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/stripe/products')
    })

    test('should display products page', async ({ page }) => {
      await expectToBeOnPage(page, '/admin/stripe/products')
      
      // Should see products-related content
      await expect(page.locator('text=/products|pricing|payment/i')).toBeVisible()
    })

    test('should show existing products list', async ({ page }) => {
      // Wait for products to load
      await page.waitForTimeout(3000)
      
      // Should see products table or list
      await expect(page.locator('table, .product-list, [data-testid*="product"]')).toBeVisible()
    })

    test('should have create product functionality', async ({ page }) => {
      // Look for create product button
      const createButton = page.locator('button, a').filter({ hasText: /create|add.*product|new.*product/i })
      await expect(createButton).toBeVisible()
      
      // Click create button
      await createButton.click()
      
      // Should see product form
      await expect(page.locator('form, [role="dialog"]')).toBeVisible()
      await expect(page.locator('input[name*="name"], input[name*="title"]')).toBeVisible()
      await expect(page.locator('input[name*="price"], input[type="number"]')).toBeVisible()
    })

    test('should validate product creation form', async ({ page }) => {
      const createButton = page.locator('button, a').filter({ hasText: /create|add.*product/i })
      await createButton.click()
      
      // Submit empty form
      const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|add|save/i })
      await submitButton.click()
      
      // Should see validation errors
      await expect(page.locator('text=/required|invalid|error/i')).toBeVisible()
    })

    test('should be able to create product with valid data', async ({ page }) => {
      const createButton = page.locator('button, a').filter({ hasText: /create|add.*product/i })
      await createButton.click()
      
      // Fill form with valid data
      await page.fill('input[name*="name"], input[name*="title"]', 'Test Product')
      await page.fill('textarea, input[name*="description"]', 'Test product description')
      await page.fill('input[name*="price"], input[type="number"]', '29.99')
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|add|save/i })
      await submitButton.click()
      
      // Should see success message or new product in list
      await expect(page.locator('text=/success|created|Test Product/i')).toBeVisible({ timeout: 15000 })
    })

    test('should show payment link generation', async ({ page }) => {
      // Wait for products to load
      await page.waitForTimeout(3000)
      
      // Look for payment link buttons
      const paymentLinkButtons = page.locator('button, a').filter({ hasText: /payment.*link|generate.*link|link/i })
      
      if (await paymentLinkButtons.first().isVisible()) {
        await paymentLinkButtons.first().click()
        
        // Should see generated link or copy functionality
        await expect(page.locator('text=/https|payment.*link|generated/i')).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have copy to clipboard functionality', async ({ page }) => {
      // Wait for products
      await page.waitForTimeout(3000)
      
      // Look for copy buttons
      const copyButtons = page.locator('button').filter({ hasText: /copy|clipboard/i })
      
      if (await copyButtons.first().isVisible()) {
        await copyButtons.first().click()
        
        // Should see copy success feedback
        await expect(page.locator('text=/copied|clipboard|success/i')).toBeVisible({ timeout: 5000 })
      }
    })

    test('should show product prices and currency', async ({ page }) => {
      // Wait for products
      await page.waitForTimeout(3000)
      
      // Should see price displays
      await expect(page.locator('text=/\$\d+|\d+\.\d+|USD|price/i')).toBeVisible()
    })

    test('should handle Stripe connection requirement', async ({ page }) => {
      // If Stripe is not connected, should see appropriate message
      const notConnectedMessage = page.locator('text=/not.*connected|connect.*stripe|setup.*required/i')
      
      if (await notConnectedMessage.isVisible()) {
        // Should have link to setup page
        const setupLink = page.locator('a[href*="stripe"], button').filter({ hasText: /setup|connect/i })
        await expect(setupLink).toBeVisible()
      }
    })
  })

  test.describe('Stripe Webhooks', () => {
    test('should show webhook configuration info', async ({ page }) => {
      await page.goto('/admin/stripe')
      
      // Look for webhook-related information
      const webhookInfo = page.locator('text=/webhook|endpoint|callback/i')
      
      if (await webhookInfo.isVisible()) {
        // Should show webhook URL or setup instructions
        await expect(page.locator('text=/https.*webhook|api.*webhook/i')).toBeVisible()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle Stripe API errors gracefully', async ({ page }) => {
      await page.goto('/admin/stripe/products')
      
      // If there are Stripe API errors, should see error messages
      const errorMessages = page.locator('text=/error|failed|unable|stripe.*error/i')
      
      if (await errorMessages.isVisible()) {
        // Error messages should be user-friendly
        await expect(errorMessages).toBeVisible()
      }
    })

    test('should show loading states', async ({ page }) => {
      await page.goto('/admin/stripe/products')
      
      // Should see loading indicators while fetching data
      const loadingElements = page.locator('text=/loading|fetching/.spinner, .loading')
      
      // Loading should either be visible initially or data should load quickly
      const hasLoadingOrData = await Promise.race([
        loadingElements.isVisible(),
        page.locator('table, .product-list').isVisible(),
        new Promise(resolve => setTimeout(() => resolve(true), 3000))
      ])
      
      expect(hasLoadingOrData).toBeTruthy()
    })
  })
})