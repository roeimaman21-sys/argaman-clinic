// @ts-check
// Visual regression tests using Playwright's built-in screenshot diffing.
// Snapshots stored under tests/visual.spec.mjs-snapshots/
// First run: --update-snapshots
import { test, expect } from '@playwright/test';

const SITE = process.env.BASE_URL || 'https://argamanclinic.com';

const PAGES = [
  { url: '/', name: 'homepage' },
  { url: '/about.html', name: 'about' },
  { url: '/services.html', name: 'services' },
  { url: '/contact.html', name: 'contact' },
  { url: '/blog.html', name: 'blog' },
  { url: '/faq.html', name: 'faq' },
  { url: '/yeutz-zugi-tel-aviv.html', name: 'landing-tel-aviv' },
  { url: '/eich-lehatzil-zugiyut-aharei-begida.html', name: 'article-betrayal' }
];

test.describe('Visual regression — Public site', () => {
  for (const p of PAGES){
    test(`screenshot: ${p.name}`, async ({ page }) => {
      await page.goto(SITE + p.url, { waitUntil: 'networkidle' });
      // Hide dynamic / time-dependent content
      await page.addStyleTag({
        content: `
          [data-dynamic], time, .timestamp, .toast-wrap, #presence-indicator { visibility: hidden !important }
          *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important }
        `
      });
      await page.waitForTimeout(300); // settle
      await expect(page).toHaveScreenshot(`${p.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02 // 2% tolerance
      });
    });
  }
});

test.describe('Visual regression — CRM login', () => {
  test('admin login screen', async ({ page }) => {
    await page.goto(SITE + '/admin.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#login-email');
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important }`
    });
    await page.waitForTimeout(300);
    await expect(page.locator('.login-card').first()).toHaveScreenshot('admin-login.png', {
      maxDiffPixelRatio: 0.02
    });
  });
});
