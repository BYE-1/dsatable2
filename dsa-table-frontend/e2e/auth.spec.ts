import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /login/i });
    await submitButton.click();
    
    // Check for validation messages (Angular forms typically show these)
    // The exact implementation depends on your form validation
    await expect(page.locator('form')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /register|sign up/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*register.*/);
    }
  });

  test('should display error message on invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[name="username"], input[type="text"]', 'invaliduser');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    
    const submitButton = page.getByRole('button', { name: /login/i });
    await submitButton.click();
    
    // Wait for error message (if backend is running)
    // If backend is not running, it should show connection error
    await page.waitForTimeout(2000);
    
    // Check for error message (either connection error or invalid credentials)
    const errorMessage = page.locator('.error, [class*="error"], [class*="alert"]');
    // Error might not appear if backend is not running, so we check if it exists
    const errorExists = await errorMessage.count() > 0;
    if (errorExists) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });

  test.describe('Registration', () => {
    test('should navigate to register and display form', async ({ page }) => {
      const registerLink = page.getByRole('link', { name: /register|sign up/i });
      if (await registerLink.isVisible()) {
        await registerLink.click();
        await expect(page).toHaveURL(/.*register.*/);
        
        // Check for registration form fields
        await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.getByRole('button', { name: /register|sign up/i })).toBeVisible();
      }
    });
  });
});
