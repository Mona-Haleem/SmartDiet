import { test as setup, expect } from '@playwright/test';

// This file will run once, log in, and save the auth state.
// We'll store the auth file path in an environment variable.
const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page, baseURL }) => {
  // 1. Go to the login page (using baseURL from config)
  await page.goto(`${baseURL}/diet/login/`);

  // 2. Perform the login
  // Using getByLabel or getByPlaceholder is more resilient than using name attributes
  await page.getByLabel('Username or Email').fill('mona');
  await page.getByLabel('Password').fill('Mona191*');
  await page.getByRole('button', { name: 'Log In' }).click();

  // 3. Wait for the page to redirect to a known authenticated route
  // This confirms login was successful before saving state.
  await expect(page).toHaveURL(new RegExp(`${baseURL}/diet/browser.*`));

  // 4. Save the storage state to the file.
  await page.storageState({ path: authFile });
});

