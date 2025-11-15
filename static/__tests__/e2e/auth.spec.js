import { test, expect } from "@playwright/test";

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the base URL
    await page.goto('/diet/login/');
  });

test('should display login form', async ({ page }) => {
  await expect(page.locator('form#auth_form')).toBeVisible();
  await expect(page.locator('input[name="login"]')).toBeVisible();
  await expect(page.locator('input[name="login_password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

 test('should show validation error for invalid email and username', async ({ page }) => {
  await page.fill('input[name="login"]', 'notanemailOrValidUsername');
  await page.fill('[name="login_password"]', 'password123');
  await page.click('button[type="submit"]');

  // Should show email validation error
  await expect(page.locator('.input-error')).toBeVisible();
});

test('should successfully login with valid credentials', async ({ page }) => {
  // Fill in valid credentials (adjust based on your test data)
  await page.fill('input[name="login"]', 'test@test.com	');
  await page.fill('[name="login_password"]', 'Mona191*');

  // Submit form
  await page.click('button[type="submit"]');

  // Should redirect to main app
  await page.waitForURL('**/diet/', { timeout: 5000 });

  // Verify user is logged in - footer should be visible
  await expect(page.locator('footer.opened')).toBeVisible();
  await expect(page.locator('#logout')).toBeVisible();
});

test('should show server error for invalid credentials', async ({ page }) => {
  await page.fill('input[name="login"]', 'wrong@example.com');
  await page.fill('[name="login_password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  // Should show error message
  await page.waitForSelector('#error-container', { timeout: 2000 });
  await expect(page.locator('#error-container')).toBeVisible();
});

test('should switch to registration form', async ({ page }) => {
  // Click register button
  await page.click('text=Don\'t have an account');

  // URL should change
  await expect(page).toHaveURL('diet/register/');

  // Registration form fields should be visible
  await expect(page.locator('[name="email"]')).toBeVisible();
  await expect(page.locator('[name="password"]')).toBeVisible();
  await expect(page.locator('[name="confirmation"]')).toBeVisible();
});

  test('should switch back to login form from registration', async ({ page }) => {
    // First go to registration
    await page.goto('/diet/register/');

    // Click login button
   // await page.addStyleTag({ content: 'footer { pointer-events: none !important; }' });
    await page.click('text=Already have an account? Log in',{ force: true });

    // Login form should be visible
    await expect(page.locator('input[name="login"]')).toBeVisible();
    await expect(page.locator('[name="login_password"]')).toBeVisible();

    // URL should change back
    await expect(page).toHaveURL('diet/login/');
  });
});

test.describe("Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diet/users/register/");
  });

  test("should display registration form", async ({ page }) => {
    await expect(page.locator("form#auth_form")).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('[name="confirmation"]')).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    await page.fill('[name="email"]', "invalid@email");
    await page.fill('[name="password"]', "ValidPass123!");
    await page.fill('[name="confirmation"]', "ValidPass123!");
    await page.click('button[type="submit"]');

    // Should show email error
    const errors = page.locator(".input-error");
    await expect(errors.first()).toBeVisible();
  });

  test("should validate password strength", async ({ page }) => {
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "weak"); // Too weak
    await page.fill('[name="confirmation"]', "weak");
    await page.click('button[type="submit"]');

    // Should show password error
    const errors = page.locator(".input-error");
    await expect(errors.first()).toBeVisible();
  });

  test("should validate password confirmation match", async ({ page }) => {
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "ValidPass123!");
    await page.fill('[name="confirmation"]', "DifferentPass123!");
    await page.click('button[type="submit"]');

    // Should show confirmation error
    const errors = page.locator(".input-error");
    await expect(errors.first()).toBeVisible();
  });

  test("should successfully register with valid data", async ({ page }) => {
    const timestamp = Date.now();
    const uniqueEmail = `testuser${timestamp}@example.com`;

    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', "ValidPass123!");
    await page.fill('[name="confirmation"]', "ValidPass123!");
    await page.click('button[type="submit"]');

    // Should redirect to main app after successful registration
    await page.waitForURL("**/diet/", { timeout: 5000 });

    // User should be logged in
    await expect(page.locator("footer.opened")).toBeVisible();
  });

  test("should show error for duplicate emails", async ({ page }) => {
    // Use existing username
    await page.fill('[name="email"]', "test@test.com");
    await page.fill('[name="password"]', "ValidPass123!");
    await page.fill('[name="confirmation"]', "ValidPass123!");
    await page.click('button[type="submit"]');

    // Should show error
    await page.waitForSelector("#error-container", { timeout: 2000 });
    await expect(page.locator("#error-container")).toBeVisible();
  });

  test("should remove validation errors when correcting input", async ({
    page,
  }) => {
    // First trigger error
    await page.focus('input[name="email"]');
    await page.evaluate(() =>
      document.querySelector('input[name="email"]').blur()
    );

    const errors = page.locator(".input-error");
    await expect(errors.first()).toBeVisible();
    // Correct the input
    await page.fill('[name="email"]', "test@email.com");
    await page.evaluate(() =>
      document.querySelector('input[name="email"]').blur()
    );

    // Username error should be gone (other fields might still have errors)
    const EmailError = page
      .locator('[name="email"]')
      .locator("..")
      .locator(".input-error");
    await expect(EmailError).not.toBeVisible();
  });
});

test.describe('Navigation and Browser History', () => {
  test('should maintain history when switching between login and register', async ({ page }) => {
    await page.goto('/diet/login/');

    // Go to register
    await page.click('text=Don\'t have an account');
    await expect(page).toHaveURL('diet/register/');

    // Go back using browser back button
    await page.goBack();
   await expect(page).toHaveURL('diet/login/');

    // Should show login form
    await expect(page.locator('input[name="login"]')).toBeVisible();

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL('diet/register/');

    // Should show register form
    await expect(page.locator('[name="email"]')).toBeVisible();
  });

  test('should handle browser back button after login', async ({ page }) => {
    await page.goto('/diet/login/');

    // Login
    await page.fill('input[name="login"]', 'test@test.com	');
    await page.fill('[name="login_password"]', 'Mona191*');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/diet/', { timeout: 5000 });

    // Go back
    await page.goBack();

    // Should either stay on main page or redirect (depending on your auth logic)
    // Verify user is still logged in
    await expect(page.locator('footer.opened')).toBeVisible();
  });
});

test.describe("Theme Toggle", () => {
  test("should toggle theme when clicking theme button", async ({ page }) => {
    await page.goto("/diet/");

    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    await page.click("#theme-toggle");
    await page.waitForTimeout(100);

    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    expect(newTheme).not.toBe(initialTheme);
  });

  test("should persist theme after page reload", async ({ page }) => {
    await page.goto("/diet/");

    await page.click("#theme-toggle");
    await page.waitForTimeout(100);

    const themeBeforeReload = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    await page.reload({ waitUntil: "domcontentloaded" });

    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    expect(themeAfterReload).toBe(themeBeforeReload);
  });
});

test.describe('Logout Flow', () => {
  test('should logout user when clicking logout button', async ({ page }) => {
    // Login first
    await page.goto('/diet/login/');
    await page.fill('input[name="login"]', 'test@test.com');
    await page.fill('input[name="login_password"]', 'Mona191*');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/diet/', { timeout: 5000 });

    // Click logout
    await page.click('#logout');

    // Should redirect to login page
    await page.waitForURL('**/diet/', { timeout: 5000 });

    // Footer should be closed (user not authenticated)
    await expect(page.locator('footer.closed')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/diet/login/');

    // Tab through form fields
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement.name);
    expect(focusedElement).toBe('login');

    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement.name);
    expect(focusedElement).toBe('login_password');

    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(focusedElement).toBe('BUTTON');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/diet/login/');

    // Check for form labels
    const labels = await page.locator('label').count();
    expect(labels).toBeGreaterThan(0);

    // Check button has text
    const buttonText = await page.locator('button[type="submit"]').textContent();
    expect(buttonText.trim().length).toBeGreaterThan(0);
  });

  //todo
  // test('should submit form with Enter key', async ({ page }) => {
  //   await page.goto('/diet/login/');

  //   await page.fill('input[name="login"]', 'testuser@example.com');
  //   await page.fill('[name="login_password"]', 'ValidPass123!');

  //   // Press Enter while in password field
  //   await page.locator('[name="login_password"]').press('Enter');

  //   // Should submit and redirect
  //   await page.waitForURL('**/diet/', { timeout: 5000 });
  // });
});

test.describe('Performance', () => {
  test('should load login page quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/diet/login/');
    await page.waitForSelector('form#auth_form');
    const loadTime = Date.now() - startTime;

    // Should load in less than 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should cache navigation between login and register', async ({ page }) => {
    await page.goto('/diet/login/');

    // First navigation to register
    const startTime1 = Date.now();
    await page.click('text=Don\'t have an account');
    await expect(page).toHaveURL('diet/register/');
    const firstNavTime = Date.now() - startTime1;

    // Navigate back
    await page.click('text=Already have an account');
    await expect(page).toHaveURL('diet/login/');

    // Second navigation to register (should be faster due to caching)
    const startTime2 = Date.now();
    await page.click('text=Don\'t have an account');
    await expect(page).toHaveURL('diet/register/');
    const secondNavTime = Date.now() - startTime2;

    // Second navigation should be faster or similar
    expect(secondNavTime).toBeLessThanOrEqual(firstNavTime * 1.5);
  });
});

test.describe('Error Recovery', () => {
  test('should recover from network error', async ({ page }) => {
    await page.goto('/diet/login/');

    // Simulate offline
    await page.context().setOffline(true);

    await page.fill('input[name="login"]', 'test@test.com	');
    await page.fill('[name="login_password"]', 'Mona191*');
    await page.click('button[type="submit"]');

    // Should show some error indication
    await page.waitForSelector('#error-container', { timeout: 5000 });

    // Go back online
    await page.context().setOffline(false);

    // Retry submission
    await page.click('button[type="submit"]');

    // Should now succeed
    await page.waitForURL('**/diet/', { timeout: 5000 });
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Throttle network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/diet/login/');
    await page.fill('input[name="login"]', 'test@test.com	');
    await page.fill('[name="login_password"]', 'Mona191*');
    await page.click('button[type="submit"]');

    // Should still complete (may take longer)
    await page.waitForURL('**/diet/', { timeout: 10000 });
  });
});

test.describe('Form State Management', () => {
  test('should preserve form data when validation fails', async ({ page }) => {
    await page.goto('/diet/register/');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'weak'); // Will fail
    await page.fill('[name="confirmation"]', 'weak');
    await page.click('button[type="submit"]');

    // Wait for error
    const errors = page.locator(".input-error");
    await expect(errors.first()).toBeVisible();
    const emailValue = await page.inputValue('[name="email"]');

    expect(emailValue).toBe('test@example.com');
  });

});
