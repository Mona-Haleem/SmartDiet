import { test, expect } from './support/fixtures.js';

test('personal library excludes another users shared recipe', async ({ ownerPage: page, seed }) => {
  await page.goto(`/diet/collections/browse/?q=${encodeURIComponent(seed.recipe.name)}`);
  await expect(page.getByText(seed.recipe.name, { exact: true })).toBeVisible();
  await page.goto(`/diet/collections/browse/?q=${encodeURIComponent(seed.sharedRecipe.name)}`);
  await expect(page.getByText(seed.sharedRecipe.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText('No items found.', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
});

test('progress day values agree with the visible water metric', async ({ ownerPage: page, seed }) => {
  await page.goto('/diet/progress/');
  const toggle = page.getByRole('button', { name: 'Show Progress', exact: true });
  if (await toggle.isVisible()) await toggle.click();
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

for (const category of ['diet', 'exercise', 'full']) {
  test(`creates and persists a ${category} plan from the library`, async ({ ownerPage: page, seed }, testInfo) => {
    const name = `Created ${category} plan ${testInfo.project.name} ${Date.now()}`;
    await page.goto('/diet/collections/browse/'); await page.locator('#add').click();
    const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Plan', exact: true }).click();
    await dialog.getByLabel('Name', { exact: true }).fill(name);
    await dialog.getByLabel('Plan type', { exact: true }).selectOption(category);
    if (category === 'full') {
      const diet = dialog.getByLabel('Diet plan', { exact: true });
      const exercise = dialog.getByLabel('Exercise plan', { exact: true });
      await expect(diet.getByRole('option', { name: seed.diet.name, exact: true })).toHaveAttribute('value', String(seed.diet.id));
      await diet.selectOption(String(seed.diet.id)); await exercise.selectOption(String(seed.exercise.id));
    }
    const saved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().includes('/plans/new/'));
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await expect(page).toHaveURL(/\/diet\/collections\/plans\//); await page.reload();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  });
}
