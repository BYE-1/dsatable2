import { test, expect } from '@playwright/test';

test.describe('Character Image Generation', () => {
  test('should display default character image', async ({ page }) => {
    // Navigate directly to the character image API endpoint
    // This tests the backend endpoint through the frontend
    await page.goto('http://localhost:8080/api/char');
    
    // Wait for SVG to load
    await page.waitForLoadState('networkidle');
    
    // Check if SVG content is present
    const content = await page.content();
    expect(content).toContain('<svg');
    expect(content).toContain('</svg>');
  });

  test('should generate character with custom hair style', async ({ page }) => {
    await page.goto('http://localhost:8080/api/char?hair=long');
    
    await page.waitForLoadState('networkidle');
    
    const content = await page.content();
    expect(content).toContain('<svg');
  });

  test('should generate character with custom colors', async ({ page }) => {
    await page.goto('http://localhost:8080/api/char?skin=%23ff0000&clothC=%2300ff00&hairColour=%230000ff');
    
    await page.waitForLoadState('networkidle');
    
    const content = await page.content();
    expect(content).toContain('<svg');
    // Check if colors are in the SVG
    expect(content).toMatch(/#ff0000|#00ff00|#0000ff/);
  });

  test('should generate character with weapon', async ({ page }) => {
    await page.goto('http://localhost:8080/api/char?weapon=sword');
    
    await page.waitForLoadState('networkidle');
    
    const content = await page.content();
    expect(content).toContain('<svg');
  });

  test('should generate character with equipment', async ({ page }) => {
    await page.goto('http://localhost:8080/api/char?equip=helmet,shoulder_pads');
    
    await page.waitForLoadState('networkidle');
    
    const content = await page.content();
    expect(content).toContain('<svg');
  });

  test('should return SVG content type', async ({ request }) => {
    const response = await request.get('http://localhost:8080/api/char');
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');
    
    const content = await response.text();
    expect(content).toContain('<svg');
  });

  test('should handle all hair options', async ({ page }) => {
    const hairOptions = ['bald', 'tomahawk', 'short_ruffled', 'short_curly', 'undercut', 'long'];
    
    for (const hair of hairOptions) {
      await page.goto(`http://localhost:8080/api/char?hair=${hair}`);
      await page.waitForLoadState('networkidle');
      
      const content = await page.content();
      expect(content).toContain('<svg');
    }
  });

  test('should handle all mouth options', async ({ page }) => {
    const mouthOptions = ['up', 'down', 'straight', 'covered'];
    
    for (const mouth of mouthOptions) {
      await page.goto(`http://localhost:8080/api/char?mouth=${mouth}`);
      await page.waitForLoadState('networkidle');
      
      const content = await page.content();
      expect(content).toContain('<svg');
    }
  });
});
