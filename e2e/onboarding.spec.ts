// e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const TEST_EMAIL = `test+${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

test.describe('New user onboarding', () => {
  test('signup page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await expect(page).toHaveURL(/signup/, { timeout: 10_000 });
  });
});

test.describe('Health check', () => {
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/health`);
    expect(response.status()).toBeLessThan(503);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});

test.describe('Pipeline submission', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/login|signin/, { timeout: 10_000 });
  });
});
