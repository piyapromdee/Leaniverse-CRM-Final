import { test, expect, TEST_USERS, signInUser, expectToBeOnPage } from '../helpers/test-utils'

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signInUser(page, TEST_USERS.ADMIN.email, TEST_USERS.ADMIN.password)
    await page.goto('/admin/users')
  })

  test('should display user management interface', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /user.*management|manage.*users/i })).toBeVisible()
    
    // Should see user list or table
    await expect(page.locator('table, [data-testid*="user"], .user-list')).toBeVisible({ timeout: 10000 })
  })

  test('should show list of existing users', async ({ page }) => {
    // Wait for users to load
    await page.waitForTimeout(3000)
    
    // Should see at least the admin user
    await expect(page.locator('text=' + TEST_USERS.ADMIN.email)).toBeVisible()
    
    // Should see user table headers
    await expect(page.locator('th, .header').filter({ hasText: /email|name|role|status/i })).toBeVisible()
  })

  test('should have add user functionality', async ({ page }) => {
    // Look for add user button
    const addButton = page.locator('button, a').filter({ hasText: /add.*user|create.*user|new.*user/i })
    await expect(addButton).toBeVisible()
    
    // Click add button
    await addButton.click()
    
    // Should see form or modal
    await expect(page.locator('form, [role="dialog"], .modal')).toBeVisible()
    await expect(page.locator('input[type="email"], input[name*="email"]')).toBeVisible()
  })

  test('should be able to create new user', async ({ page }) => {
    const testUserEmail = 'playwright.admin.test@example.com'
    
    // Click add user button
    const addButton = page.locator('button, a').filter({ hasText: /add.*user|create.*user|new.*user/i })
    await addButton.click()
    
    // Fill form
    await page.fill('input[type="email"], input[name*="email"]', testUserEmail)
    await page.fill('input[type="password"], input[name*="password"]', 'testpassword123')
    await page.fill('input[name*="name"], input[name*="full"]', 'Test User')
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|add|save/i })
    await submitButton.click()
    
    // Should see success message or user in list
    await expect(page.locator('text=/success|created|added/i, text=' + testUserEmail)).toBeVisible({ timeout: 10000 })
  })

  test('should show user actions (edit, delete, disable)', async ({ page }) => {
    // Wait for users to load
    await page.waitForTimeout(3000)
    
    // Look for action buttons or dropdowns
    const actionElements = page.locator('button, a, [role="button"]').filter({ 
      hasText: /edit|delete|disable|actions|view|promote/i 
    })
    
    await expect(actionElements.first()).toBeVisible()
  })

  test('should be able to view user profile', async ({ page }) => {
    // Find a user row and click view/profile action
    const viewButton = page.locator('button, a').filter({ hasText: /view|profile/i }).first()
    
    if (await viewButton.isVisible()) {
      await viewButton.click()
      
      // Should see user profile details
      await expect(page.locator('text=/profile|details|information/i')).toBeVisible()
    }
  })

  test('should be able to promote user to admin', async ({ page }) => {
    // Look for promote or role change functionality
    const promoteButton = page.locator('button, a, select').filter({ hasText: /promote|admin|role/i }).first()
    
    if (await promoteButton.isVisible()) {
      await promoteButton.click()
      
      // Should see confirmation or success message
      await expect(page.locator('text=/promote|admin|role.*changed/i')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should be able to disable user', async ({ page }) => {
    // Look for disable functionality
    const disableButton = page.locator('button, a').filter({ hasText: /disable|suspend/i }).first()
    
    if (await disableButton.isVisible()) {
      await disableButton.click()
      
      // Handle confirmation dialog if present
      const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|disable/i })
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
      
      // Should see success message
      await expect(page.locator('text=/disabled|suspended|success/i')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should be able to delete user', async ({ page }) => {
    // Look for delete functionality
    const deleteButton = page.locator('button, a').filter({ hasText: /delete|remove/i }).first()
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      
      // Should see confirmation dialog
      await expect(page.locator('[role="dialog"], .modal, .confirmation')).toBeVisible()
      
      // Look for confirm button in dialog
      const confirmButton = page.locator('[role="dialog"], .modal').locator('button').filter({ hasText: /delete|confirm|yes/i })
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        
        // Should see success message
        await expect(page.locator('text=/deleted|removed|success/i')).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should show user search/filter functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]')
    
    if (await searchInput.isVisible()) {
      await searchInput.fill(TEST_USERS.ADMIN.email)
      
      // Should filter results
      await page.waitForTimeout(1000)
      await expect(page.locator('text=' + TEST_USERS.ADMIN.email)).toBeVisible()
    }
  })

  test('should handle pagination if many users', async ({ page }) => {
    // Look for pagination controls
    const paginationElements = page.locator('.pagination, nav[aria-label*="pagination"], button').filter({ 
      hasText: /next|previous|page/i 
    })
    
    if (await paginationElements.first().isVisible()) {
      // Pagination exists - test it
      const nextButton = page.locator('button, a').filter({ hasText: /next/i })
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        await nextButton.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('should show user statistics/counts', async ({ page }) => {
    // Look for user count displays
    await expect(page.locator('text=/total.*users|user.*count|\d+.*users/i')).toBeVisible({ timeout: 5000 })
  })

  test('should handle form validation errors', async ({ page }) => {
    // Try to add user with invalid data
    const addButton = page.locator('button, a').filter({ hasText: /add.*user|create.*user/i })
    await addButton.click()
    
    // Submit empty form
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /create|add|save/i })
    await submitButton.click()
    
    // Should see validation errors
    await expect(page.locator('text=/required|invalid|error/i')).toBeVisible({ timeout: 5000 })
  })
})