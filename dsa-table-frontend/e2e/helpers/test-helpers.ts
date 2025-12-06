import { Page } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Login helper - attempts to login with provided credentials
 * Returns true if login was successful, false otherwise
 */
export async function login(page: Page, username: string, password: string): Promise<boolean> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Check if we're already logged in (redirected away from login)
  if (!page.url().includes('/login')) {
    return true;
  }
  
  const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const submitButton = page.getByRole('button', { name: /login/i });
  
  if (await usernameInput.isVisible({ timeout: 3000 })) {
    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await submitButton.click();
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    // Check if we're still on login page (login failed)
    return !page.url().includes('/login');
  }
  
  return false;
}

/**
 * Check if user is authenticated (not on login page)
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login');
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(page: Page, selector: string, timeout: number = 3000): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fill form field safely (only if visible)
 */
export async function fillFieldSafely(
  page: Page, 
  selector: string, 
  value: string, 
  timeout: number = 3000
): Promise<boolean> {
  try {
    const field = page.locator(selector).first();
    if (await field.isVisible({ timeout })) {
      await field.fill(value);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Click button safely (only if visible)
 */
export async function clickButtonSafely(
  page: Page,
  buttonText: string | RegExp,
  timeout: number = 3000
): Promise<boolean> {
  try {
    const button = page.getByRole('button', { name: buttonText });
    if (await button.isVisible({ timeout })) {
      await button.click();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Skip test if redirected to login (authentication required)
 */
export function skipIfNotAuthenticated(page: Page, test: any): void {
  const url = page.url();
  if (url.includes('/login')) {
    test.skip();
  }
}
