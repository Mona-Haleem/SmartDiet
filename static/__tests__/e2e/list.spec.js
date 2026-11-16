import { test, expect } from './support/fixtures.js';

test('personal library excludes another users shared recipe', async ({ ownerPage: page, seed }) => {
  await page.goto('/diet/collections/browse/');
  await expect(page.getByText(seed.recipe.name, { exact: true })).toBeVisible();
  await expect(page.getByText(seed.sharedRecipe.name, { exact: true })).toHaveCount(0);
});

test('discovery shows shared content and excludes private recipes', async ({ ownerPage: page, seed }) => {
  await page.goto('/diet/collections/browse/discover/');
  await expect(page.getByText(seed.sharedRecipe.name, { exact: true })).toBeVisible();
  await expect(page.getByText(seed.recipe.name, { exact: true })).toHaveCount(0);
});

test('search produces an empty state and back navigation restores results', async ({ ownerPage: page }) => {
  await page.goto('/diet/collections/browse/?q=E2E%20Oats');
  const search = page.getByPlaceholder('search in you collection');
  await expect(page.locator('.card-list-grid .ele-container').first()).toBeVisible();
  await search.fill('no-recipe-matches-this-search');
  await expect(page).toHaveURL(/q=no-recipe-matches-this-search/);
  await expect(page.getByText('No items found.', { exact: true })).toBeVisible();
  await expect(page.locator('.card-list-grid .ele-container')).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('.card-list-grid .ele-container').first()).toBeVisible();
});

test('paging changes visible recipes and preserves the filter', async ({ ownerPage: page }) => {
  await page.goto('/diet/collections/browse/?q=E2E%20Oats&order=name&size=6');
  const first = await page.locator('.card-list-grid .ele-container').first().innerText();
  await page.locator('#next').click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/q=E2E/);
  await expect(page.locator('.card-list-grid .ele-container').first()).not.toHaveText(first);
});

test('opens recipe details through the visible card', async ({ ownerPage: page, seed }) => {
  await page.goto(`/diet/collections/browse/?q=${encodeURIComponent(seed.recipe.name)}`);
  await page.getByText(seed.recipe.name, { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/recipes/${seed.recipe.id}/`));
  await expect(page.getByText('Cook and serve', { exact: true })).toBeVisible();
});

test('creation dialog opens, accepts a recipe, and persists it after reload', async ({ ownerPage: page }, testInfo) => {
  const name = `Created recipe ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/diet/collections/browse/');
  await page.locator('#add').click();
  const form = page.locator('#creationForm');
  await expect(form).toBeVisible();
  await form.locator('input[name="name"]').fill(name);
  await form.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/diet\/collections\/recipes\//);
  await page.reload();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
});

test('progress day values agree with the visible water metric', async ({ ownerPage: page, seed }) => {
  await page.goto('/diet/progress/');
  await page.locator('select.period-select').selectOption('day');
  await expect(page.getByText('Water', { exact: true }).first()).toBeVisible();
  const response = await page.request.get(`/diet/progress/day/?date=${seed.today}&type=diet`);
  expect(response.status()).toBe(200);
  const metric = (await response.json()).metrics.find(item => item.name === 'Water');
  expect(metric.value).toBe(1000);
  const row = page.locator('tr.metric-row').filter({ hasText: 'Water' });
  await expect(row.locator('input.metric-input')).toHaveValue('1000');
});

test('library initializes without uncaught JavaScript errors', async ({ ownerPage: page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/diet/collections/browse/');
  await expect(page.locator('.card-list-grid .ele-container').first()).toBeVisible();
  expect(errors).toEqual([]);
});
