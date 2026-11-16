import AxeBuilder from '@axe-core/playwright';
import { test, expect, loginViaApi } from './support/fixtures.js';

const pages = [
  { name: 'login', path: '/diet/login/', authenticated: false },
  { name: 'register', path: '/diet/register/', authenticated: false },
  { name: 'home', path: '/diet/', authenticated: true },
  { name: 'profile', path: '/diet/users/profile/', authenticated: true },
  { name: 'library', path: '/diet/collections/browse/', authenticated: true },
  { name: 'discovery', path: '/diet/collections/browse/discover/', authenticated: true },
  { name: 'progress', path: '/diet/progress/', authenticated: true },
  { name: 'recipe details', path: seed => `/diet/collections/recipes/${seed.recipe.id}/${encodeURIComponent(seed.recipe.name)}/`, authenticated: true },
  { name: 'plan details', path: seed => `/diet/collections/plans/${seed.diet.id}/${encodeURIComponent(seed.diet.name)}/`, authenticated: true },
];

for (const theme of ['', 'dark']) {
  for (const item of pages) {
    test(`@a11y ${item.name} in ${theme || 'light'} theme`, async ({ page, seed }, testInfo) => {
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      if (item.authenticated) await loginViaApi(page);
      const response = await page.goto(typeof item.path === 'function' ? item.path(seed) : item.path);
      expect(response.status()).toBe(200);
      await page.waitForFunction(() => Boolean(window.Alpine && document.querySelector('[x-data]')?._x_dataStack));
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
      expect(scan.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(node => node.target) }))).toEqual([]);
    });
  }
}

test('@a11y creation dialog contains focus and restores it on Escape', async ({ ownerPage: page }) => {
  await page.goto('/diet/collections/browse/');
  const opener = page.locator('#add');
  await opener.click();
  const dialog = page.getByRole('dialog', { name: /Create New Recipe/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Basic Information');
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('@a11y calendar dates can be reached and selected with the keyboard', async ({ ownerPage: page, seed }) => {
  await page.goto('/diet/progress/');
  const today = page.locator('.calendar-day.today');
  await expect(today).toBeVisible();
  await expect(today).toHaveRole('button');
  await expect(today).toHaveAccessibleName(/\S/);
  await today.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('select.period-select')).toHaveValue('day');
  await expect(page.locator('tr.metric-row').filter({ hasText: 'Water' })).toBeVisible();
});

test('@a11y login reflows at 320 CSS pixels with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/diet/login/');
  const input = page.locator('input[name="login"]');
  await expect(input).toBeVisible();
  const box = await input.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
});
