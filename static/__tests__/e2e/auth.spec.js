import { test, expect, loginViaApi } from './support/fixtures.js';

async function fillLogin(page, login, password) {
  await page.goto('/diet/login/');
  await page.waitForFunction(() => window.Alpine && document.querySelector('#auth_form')?._x_dataStack);
  await page.locator('input[name="login"]').fill(login);
  await page.locator('[name="login_password"]').fill(password);
}

test('protected library redirects to the login form', async ({ page }) => {
  await page.goto('/diet/collections/browse/');
  await expect(page).toHaveURL(/\/diet\/(users\/)?login\//);
  await expect(page.locator('input[name="login"]')).toBeVisible();
});

for (const identifier of ['username', 'email']) {
  test(`logs in using ${identifier} and can log out`, async ({ page, seed }) => {
    await fillLogin(page, seed.owner[identifier], seed.owner.password);
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(page).toHaveURL(/\/diet\/$/);
    await expect(page.locator('#logout')).toBeVisible();
    await page.locator('#logout').click();
    await expect(page.locator('input[name="login"]')).toBeVisible();
    await page.goto('/diet/users/profile/');
    await expect(page).toHaveURL(/\/diet\/(users\/)?login\//);
  });
}

test('invalid login can be corrected and resubmitted without a page reload', async ({ page, seed }) => {
  await fillLogin(page, seed.owner.email, 'WrongPassword1!');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.locator('#error-container .input-error').first()).toBeVisible();
  await page.locator('[name="login_password"]').fill(seed.owner.password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(/\/diet\/$/);
});

test('registration sends the new user to their profile and persists their session', async ({ page }, testInfo) => {
  const email = `registered-${testInfo.project.name}-${Date.now()}@example.test`;
  await page.goto('/diet/register/');
  await page.waitForFunction(() => window.Alpine && document.querySelector('#auth_form')?._x_dataStack);
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill('Registration1!');
  await page.locator('[name="confirmation"]').fill('Registration1!');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/\/diet\/users\/profile\/$/);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
});

test('keyboard submission logs in without a mouse', async ({ page, seed }) => {
  await fillLogin(page, seed.owner.username, seed.owner.password);
  await page.locator('input[name="login"]').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[name="login_password"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/diet\/$/);
});

test('theme selection survives a reload', async ({ page }) => {
  await page.goto('/diet/login/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', '');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('profile birth-date edit persists after reload', async ({ page, seed }) => {
  await loginViaApi(page, seed.owner);
  await page.goto('/diet/users/profile/');
  const input = page.locator('input[name="birth_date"]');
  const updatedDate = await input.inputValue() === '1995-06-15' ? '1996-06-15' : '1995-06-15';
  const saved = page.waitForResponse(response => response.url().endsWith('/profile/update/')
    && response.request().method() === 'PATCH');
  await input.fill(updatedDate);
  await input.press('Tab');
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(input).toHaveValue(updatedDate);
});
