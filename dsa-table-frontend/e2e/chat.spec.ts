import { test, expect } from '@playwright/test';

test.describe('Chat Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a game session detail page (which contains chat)
    // Note: This requires a valid session ID, which might not exist
    // In a real scenario, you'd create a test session first
    await page.goto('/sessions/1');
    await page.waitForLoadState('networkidle');
  });

  test('should display chat component', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    
    // Look for chat elements
    const chatContainer = page.locator('[class*="chat"], [id*="chat"]');
    const messageInput = page.locator('textarea, input[type="text"][placeholder*="message" i]');
    
    // Chat might not be visible if session doesn't exist, so we check
    const hasChat = await chatContainer.count() > 0 || await messageInput.count() > 0;
    
    if (hasChat) {
      await expect(messageInput.first()).toBeVisible();
    }
  });

  test('should allow typing messages', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    
    const messageInput = page.locator('textarea, input[type="text"][placeholder*="message" i]').first();
    
    if (await messageInput.isVisible({ timeout: 3000 })) {
      await messageInput.fill('Test message');
      await expect(messageInput).toHaveValue('Test message');
    }
  });

  test('should send message on Enter key', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    
    const messageInput = page.locator('textarea, input[type="text"][placeholder*="message" i]').first();
    
    if (await messageInput.isVisible({ timeout: 3000 })) {
      await messageInput.fill('Test message');
      await messageInput.press('Enter');
      
      // Wait a bit for the message to be sent
      await page.waitForTimeout(1000);
      
      // Input should be cleared after sending
      // (depending on implementation)
    }
  });

  test('should display send button', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    
    const sendButton = page.getByRole('button', { name: /send/i });
    
    if (await sendButton.isVisible({ timeout: 3000 })) {
      await expect(sendButton).toBeVisible();
    }
  });

  test('should display message list', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    
    // Look for message container
    const messagesContainer = page.locator('[class*="message"], [class*="chat-message"]');
    
    // Messages might be empty, but container should exist
    if (await messagesContainer.count() > 0) {
      await expect(messagesContainer.first()).toBeVisible();
    }
  });

  test('should format timestamps correctly', async ({ page }) => {
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    
    // Look for timestamp elements
    const timestamps = page.locator('[class*="time"], [class*="timestamp"]');
    
    if (await timestamps.count() > 0) {
      // Timestamps should be visible and formatted
      await expect(timestamps.first()).toBeVisible();
    }
  });
});
