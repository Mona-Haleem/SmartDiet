import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './support/fixtures.js';

test.setTimeout(20000);

async function post(page, url, data) {
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'csrftoken').value;
  const response = await page.request.post(url, { data, headers: { 'X-CSRFToken': token } });
  expect(response.status(), `fixture creation at ${url}`).toBe(200);
  return response.json();
}

async function freshPlan(page, testInfo) {
  const name = `Editor ${testInfo.project.name} ${Date.now()}`;
  const item = await post(page, `/diet/collections/plans/new/${encodeURIComponent(name)}/`, {
    name, type: 'plan', category: 'diet', duration_days: 1, create_default_sections: true,
  });
  await page.goto(item.redirect);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('.section > span > .header').filter({ hasText: /^Schedule$/ })).toHaveCount(1);
  return item;
}

async function openSectionEditor(page) {
  const title = page.locator('.section > span > .header').filter({ hasText: /^Schedule$/ }).first();
  const edit = title.locator('..').locator('.editBtn');
  if (!(await title.isVisible())) await page.locator('#next').click();
  await title.locator('..').hover();
  await expect(edit).toBeVisible(); await edit.click();
  const editor = page.locator('.details-editor-container'); await expect(editor).toBeVisible();
  return editor;
}

async function openDirectionsEditor(page, seed) {
  await page.goto(`/diet/collections/recipes/${seed.recipe.id}/${encodeURIComponent(seed.recipe.name)}/`);
  const edit = page.locator('#directions .fa-edit');
  const title = page.locator('#directions > span').filter({ hasText: 'Directions:' }).first();
  if (!(await title.isVisible())) await page.locator('#next').click();
  await title.hover();
  await edit.click(); const editor = page.locator('.details-editor-container'); await expect(editor).toBeVisible();
  return editor;
}

async function showDailyProgress(page) {
  await page.goto('/diet/progress/');
  const toggle = page.getByRole('button', { name: 'Show Progress', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page.locator('select.period-select').selectOption('day');
  await expect(page.locator('.metrics-editor-wrapper')).toBeVisible();
}

test('plan section edits persist as structured content after reload', async ({ ownerPage: page }, testInfo) => {
  const item = await freshPlan(page, testInfo); const editor = await openSectionEditor(page);
  const text = `Section saved ${testInfo.project.name}`;
  await editor.getByTitle('Add Paragraph', { exact: true }).click();
  await editor.locator('.editable-content').last().fill(text);
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/plans/sections/'));
  await editor.getByRole('button', { name: 'Save Changes' }).click(); expect((await saved).status()).toBe(200);
  await expect(editor).not.toBeVisible(); await page.goto(item.redirect);
  await expect(page.getByText(text, { exact: true })).toHaveCount(1);
});

test('cancelling a section draft preserves the saved document', async ({ ownerPage: page }, testInfo) => {
  const item = await freshPlan(page, testInfo); const editor = await openSectionEditor(page);
  const text = `Unsaved draft ${Date.now()}`;
  await editor.getByTitle('Add Paragraph', { exact: true }).click();
  await editor.locator('.editable-content').last().fill(text); await editor.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(editor).not.toBeVisible(); expect((await page.goto(item.redirect)).status()).toBe(200);
  await expect(page.getByRole('heading', { name: item.name, exact: true })).toBeVisible();
  await expect(page.locator('.section > span > .header').filter({ hasText: /^Schedule$/ })).toHaveCount(1);
  await expect(page.getByText(text, { exact: true })).toHaveCount(0);
});

test('recipe directions survive a save and full reload', async ({ ownerPage: page, seed }, testInfo) => {
  const editor = await openDirectionsEditor(page, seed); const text = `Directions saved ${testInfo.project.name}`;
  await editor.getByTitle('Add Paragraph', { exact: true }).click();
  await editor.locator('.editable-content').last().fill(text);
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes(`/recipes/${seed.recipe.id}/`));
  await editor.getByRole('button', { name: 'Save Changes' }).click(); expect((await saved).status()).toBe(200);
  await page.reload(); await expect(page.getByText(text, { exact: true })).toHaveCount(1);
});

test('a failed editor save keeps the draft available for retry', async ({ ownerPage: page }, testInfo) => {
  await freshPlan(page, testInfo); const editor = await openSectionEditor(page);
  await editor.getByTitle('Add Paragraph', { exact: true }).click();
  await editor.locator('.editable-content').last().fill('Keep this draft');
  await page.route('**/diet/collections/plans/sections/**', route => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary failure' }) }) : route.continue());
  page.once('dialog', dialog => dialog.accept());
  await editor.getByRole('button', { name: 'Save Changes' }).click();
  await expect(editor).toBeVisible(); await expect(editor.locator('.editable-content').last()).toHaveText('Keep this draft');
});

test('a global metric value is shared between diet and exercise views', async ({ ownerPage: page, seed }, testInfo) => {
  const name = `Shared value ${testInfo.project.name} ${Date.now()}`;
  await post(page, '/diet/progress/metric/', { name, type: 'daily', target: 1000, start: 0,
    metricType: 'customGoal', plan_type: 'diet', date: seed.today });
  await showDailyProgress(page);
  const row = page.locator('tr.metric-row').filter({ hasText: name }); await expect(row).toBeVisible();
  await row.locator('input.metric-input').fill('200');
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/value/'));
  await row.locator('input.metric-input').press('Tab'); expect((await saved).status()).toBe(200);
  const exerciseButton = page.locator('button.plan-btn').filter({ hasText: 'Exercise' });
  const [received] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/progress/day/')
      && new URL(response.url()).searchParams.get('type') === 'exercise', { timeout: 8000 }),
    exerciseButton.click(),
  ]);
  await expect(exerciseButton).toHaveClass(/active/); expect(received.status()).toBe(200);
  expect((await received.json()).metrics.find(metric => metric.name === name)?.value).toBe(200);
  await expect(row).toBeVisible(); await expect(row.locator('input.metric-input')).toHaveValue('200');
});

test('profile activity selection retains its saved value after reload', async ({ ownerPage: page }) => {
  await page.goto('/diet/users/profile/');
  const toggle = page.getByRole('button', { name: 'Show lifestyle information', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  const select = page.getByLabel('Activity level', { exact: true });
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/profile/update/'));
  await select.selectOption('active'); expect((await saved).status()).toBe(200); await page.reload();
  if (await toggle.isVisible()) await toggle.click(); await expect(select).toHaveValue('active');
});

test('@a11y section edit controls work with keyboard activation', async ({ ownerPage: page }, testInfo) => {
  await freshPlan(page, testInfo);
  const edit = page.locator('.section > span > .header').filter({ hasText: /^Schedule$/ }).first().locator('..').locator('.editBtn');
  const title = page.locator('.section > span > .header').filter({ hasText: /^Schedule$/ }).first();
  if (!(await title.isVisible())) await page.locator('#next').click();
  await title.locator('..').hover();
  await expect(edit).toHaveRole('button'); await expect(edit).toHaveAccessibleName(/edit/i);
  await edit.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.details-editor-container')).toBeVisible();
});

for (const theme of ['', 'dark']) {
  test(`@a11y rich editor in ${theme || 'light'} theme`, async ({ ownerPage: page }, testInfo) => {
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await freshPlan(page, testInfo); const editor = await openSectionEditor(page);
    await editor.getByTitle('Add Paragraph', { exact: true }).click();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    expect.soft(scan.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
    await expect.soft(editor).toHaveRole('dialog'); await expect(editor).toHaveAccessibleName(/Schedule/);
  });
  for (const kind of ['metric', 'inactive']) {
    test(`@a11y ${kind} dialog in ${theme || 'light'} theme`, async ({ ownerPage: page }, testInfo) => {
      await page.addInitScript(value => localStorage.setItem('theme', value), theme); await showDailyProgress(page);
      await page.getByTitle(kind === 'metric' ? 'Add Custom Goal' : 'Show Inactive Metrics', { exact: true }).click();
      const dialog = page.locator(kind === 'metric' ? '.metric-modal' : '.inactive-modal'); await expect(dialog).toBeVisible();
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
      expect.soft(scan.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
      await expect(dialog).toHaveRole('dialog');
    });
  }
}
