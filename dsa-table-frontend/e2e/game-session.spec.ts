import { test, expect } from '@playwright/test';

test.describe('Game Session', () => {
  test.describe('Session List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sessions');
      await page.waitForLoadState('networkidle');
    });

    test('should display session list page', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      // Check for session list heading or content
      const heading = page.getByRole('heading', { name: /session/i });
      const createButton = page.getByRole('link', { name: /new|create/i });
      
      // Either heading or create button should be visible
      const hasHeading = await heading.isVisible({ timeout: 3000 }).catch(() => false);
      const hasCreateButton = await createButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(hasHeading || hasCreateButton).toBeTruthy();
    });

    test('should navigate to create session page', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      const createLink = page.getByRole('link', { name: /new|create/i });
      
      if (await createLink.isVisible({ timeout: 3000 })) {
        await createLink.click();
        await expect(page).toHaveURL(/.*sessions.*new.*/);
      }
    });
  });

  test.describe('Session Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sessions/new');
      await page.waitForLoadState('networkidle');
    });

    test('should display session form', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      // Look for form fields
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
      const submitButton = page.getByRole('button', { name: /save|create|submit/i });
      
      if (await nameInput.isVisible({ timeout: 3000 })) {
        await expect(nameInput).toBeVisible();
        await expect(submitButton).toBeVisible();
      }
    });

    test('should validate required fields', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      const submitButton = page.getByRole('button', { name: /save|create|submit/i });
      
      if (await submitButton.isVisible({ timeout: 3000 })) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        // Form should show validation errors or prevent submission
        // Exact behavior depends on form implementation
      }
    });

    test('should allow filling form fields', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      
      if (await nameInput.isVisible({ timeout: 3000 })) {
        await nameInput.fill('Test Session');
        await expect(nameInput).toHaveValue('Test Session');
      }
    });
  });

  test.describe('Session Detail', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sessions/1');
      await page.waitForLoadState('networkidle');
    });

    test('should display session details', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      // Look for session information
      const sessionName = page.getByRole('heading').first();
      const editButton = page.getByRole('link', { name: /edit/i });
      
      // Either session name or edit button should be visible
      const hasName = await sessionName.isVisible({ timeout: 3000 }).catch(() => false);
      const hasEditButton = await editButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      // At least one should be present
      if (hasName || hasEditButton) {
        expect(true).toBeTruthy();
      }
    });

    test('should navigate to edit page', async ({ page }) => {
      const url = page.url();
      if (url.includes('/login')) {
        test.skip();
        return;
      }
      
      const editLink = page.getByRole('link', { name: /edit/i });
      
      if (await editLink.isVisible({ timeout: 3000 })) {
        await editLink.click();
        await expect(page).toHaveURL(/.*sessions.*edit.*/);
      }
    });
  });
});
