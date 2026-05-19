// @ts-check
// Accessibility tests using axe-playwright
// Run: npm install -D @axe-core/playwright && npx playwright test tests/a11y.spec.mjs
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SITE = process.env.BASE_URL || 'https://argamanclinic.com';

const PAGES_TO_TEST = [
  '/',
  '/about.html',
  '/services.html',
  '/contact.html',
  '/blog.html',
  '/faq.html'
];

test.describe('A11y — Public Site', () => {
  for (const url of PAGES_TO_TEST){
    test(`a11y: ${url}`, async ({ page }) => {
      await page.goto(SITE + url);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      // Allow some leniency on serious only; log moderate
      const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      if (serious.length > 0){
        console.error(`Violations on ${url}:`, JSON.stringify(serious, null, 2));
      }
      expect(serious, `Critical/serious a11y violations on ${url}`).toEqual([]);
    });
  }
});

test.describe('A11y — Article page (representative)', () => {
  test('blog article passes WCAG AA', async ({ page }) => {
    await page.goto(SITE + '/eich-lehatzil-zugiyut-aharei-begida.html');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);
  });
});

test.describe('A11y — CRM login screen', () => {
  test('admin.html login passes WCAG AA', async ({ page }) => {
    await page.goto(SITE + '/admin.html');
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, `Critical violations on login: ${JSON.stringify(serious)}`).toEqual([]);
  });
});
