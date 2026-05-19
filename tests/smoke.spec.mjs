// @ts-check
// Smoke tests for Argaman Clinic CRM (Playwright)
// Run: npx playwright test
// Requires: npm install --save-dev @playwright/test && npx playwright install chromium

import { test, expect } from '@playwright/test';

const SITE = 'https://argamanclinic.com';

test.describe('Public site', () => {
  test('homepage loads with key elements', async ({ page }) => {
    await page.goto(SITE);
    await expect(page).toHaveTitle(/גל ממן|ארגמן/);
    // Hero or main CTA visible
    await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible();
    // Navigation present
    await expect(page.locator('nav, .navbar').first()).toBeVisible();
  });

  test('contact page form fields present', async ({ page }) => {
    await page.goto(`${SITE}/contact.html`);
    // Skip honeypot (_honey) field — find a real visible name input
    await expect(page.locator('input[type="email"], input#contact-name, input[name="name"]').first()).toBeVisible();
  });

  test('article page has Article schema', async ({ page }) => {
    await page.goto(`${SITE}/eich-lehatzil-zugiyut-aharei-begida.html`);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const merged = schemas.join(' ');
    expect(merged).toContain('Article');
    expect(merged).toContain('headline');
  });

  test('sitemap.xml is reachable', async ({ request }) => {
    const res = await request.get(`${SITE}/sitemap.xml`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('<url>');
    expect(text).toContain('argamanclinic.com');
  });

  test('robots.txt is sensible', async ({ request }) => {
    const res = await request.get(`${SITE}/robots.txt`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('Sitemap:');
    expect(text).toContain('Disallow: /admin');
  });

  test('IndexNow key file is served', async ({ request }) => {
    const res = await request.get(`${SITE}/2cb3142c4df7fc201f06a800e7796b83.txt`);
    expect(res.status()).toBe(200);
  });

  test('security headers present', async ({ request }) => {
    const res = await request.get(SITE);
    const headers = res.headers();
    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toBeTruthy();
  });
});

test.describe('CRM (admin.html)', () => {
  test('login screen loads', async ({ page }) => {
    await page.goto(`${SITE}/admin.html`);
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-pass')).toBeVisible();
    await expect(page.locator('#login-btn-el')).toBeVisible();
  });

  test('forgot password link works', async ({ page }) => {
    await page.goto(`${SITE}/admin.html`);
    await expect(page.locator('a:has-text("שכחתי")')).toBeVisible();
  });

  test('admin.html has noindex meta', async ({ page }) => {
    await page.goto(`${SITE}/admin.html`);
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta).toContain('noindex');
  });

  test('all CRM modules load without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${SITE}/admin.html`);
    await page.waitForTimeout(3000); // let scripts settle
    // Filter out expected (non-error) warnings
    const real = errors.filter(e =>
      !e.includes('Supabase library failed') && // ok if offline test
      !e.includes('ad-blocker') &&
      !e.includes('No authenticated user') &&
      !e.includes('Failed to load resource')
    );
    expect(real, 'Unexpected console errors:\n' + real.join('\n')).toHaveLength(0);
  });
});

test.describe('Performance', () => {
  test('homepage loads in <3s', async ({ page }) => {
    const start = Date.now();
    await page.goto(SITE, { waitUntil: 'load' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('images have explicit dimensions (CLS)', async ({ page }) => {
    await page.goto(SITE);
    const imgs = await page.locator('img').all();
    const missing = [];
    for (const img of imgs.slice(0, 10)){
      const w = await img.getAttribute('width');
      const h = await img.getAttribute('height');
      const src = await img.getAttribute('src');
      // Allow style with explicit dimensions too
      const style = await img.getAttribute('style');
      if (!w && !h && !(style && /\bwidth\s*:/.test(style))) missing.push(src);
    }
    expect(missing, 'Images without dimensions: ' + missing.join(', ')).toHaveLength(0);
  });
});
