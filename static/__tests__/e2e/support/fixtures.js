import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
export const readSeed = () => JSON.parse(readFileSync(path.join(root, '.test-data/seed.json'), 'utf8'));

// Use installed, lockfile-pinned frontend assets instead of depending on CDN availability.
async function localAssets(context) {
  await context.route(/^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)\//, async route => {
    const url = route.request().url();
    let file;
    if (url.includes('bootstrap@5.3.3/dist/css/')) file = 'bootstrap/dist/css/bootstrap.min.css';
    else if (url.includes('bootstrap@5.3.3/dist/js/')) file = 'bootstrap/dist/js/bootstrap.bundle.min.js';
    else if (url.includes('alpinejs@')) file = 'alpinejs/dist/cdn.min.js';
    else if (url.includes('htmx.org@')) file = 'htmx.org/dist/htmx.min.js';
    else if (url.includes('/npm/chart.js')) file = 'chart.js/dist/chart.umd.js';
    else if (url.includes('/font-awesome/') && url.includes('/css/')) file = '@fortawesome/fontawesome-free/css/all.min.css';
    else if (url.includes('/font-awesome/') && url.includes('/webfonts/')) file = `@fortawesome/fontawesome-free/webfonts/${path.basename(new URL(url).pathname)}`;
    if (!file) return route.abort('blockedbyclient');
    return route.fulfill({ path: path.join(root, 'node_modules', file) });
  });
}

export async function loginViaApi(page, account = readSeed().owner) {
  await page.request.get('/diet/login/');
  const csrf = (await page.context().cookies()).find(cookie => cookie.name === 'csrftoken');
  const response = await page.request.post('/diet/users/login/', {
    form: { login: account.username, login_password: account.password },
    headers: { 'X-CSRFToken': csrf.value },
  });
  expect(response.status(), 'seeded account login').toBe(200);
}

export const test = base.extend({
  localAssets: [async ({ context }, use) => { await localAssets(context); await use(); }, { auto: true }],
  seed: async ({}, use) => { await use(readSeed()); },
  ownerPage: async ({ page }, use) => { await loginViaApi(page); await use(page); },
});

export { expect };
