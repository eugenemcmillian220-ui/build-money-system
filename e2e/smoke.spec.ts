/**
 * E2E Smoke Tests — Critical Path Verification
 * 
 * Run with: npx playwright test e2e/smoke.spec.ts
 * 
 * These tests verify the critical user flows are functional after each deploy.
 * They don't test business logic deeply — just that pages load, forms work,
 * and API endpoints respond correctly.
 * 
 * Prerequisites:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("Smoke Tests", () => {
  test("homepage loads", async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/./); // Has some title
  });

  test("login page loads with form", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Should have email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
  });

  test("signup page loads with form", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("health endpoint returns healthy status", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    expect(response.status()).toBeLessThanOrEqual(503);
    
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("checks");
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
  });

  test("API routes require authentication", async ({ request }) => {
    // Test a few critical API routes that should reject unauthenticated requests
    const protectedRoutes = [
      "/api/billing",
      "/api/projects",
      "/api/generate",
    ];

    for (const route of protectedRoutes) {
      const response = await request.post(`${BASE_URL}${route}`, {
        headers: {
          "Content-Type": "application/json",
          "Origin": BASE_URL,
        },
        data: {},
      });
      
      // Should return 401 (unauthorized) not 500 (server error)
      expect(
        response.status(),
        `${route} should return 401, got ${response.status()}`
      ).toBe(401);
    }
  });

  test("CSRF protection blocks cross-origin requests", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/projects`, {
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://evil-site.com",
      },
      data: {},
    });
    
    expect(response.status()).toBe(403);
  });

  test("security headers are present", async ({ request }) => {
    const response = await request.get(BASE_URL);
    
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["strict-transport-security"]).toBeTruthy();
    expect(headers["content-security-policy"]).toBeTruthy();
    expect(headers["referrer-policy"]).toBeTruthy();
  });

  test("Stripe webhook endpoint exists and rejects unsigned requests", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/billing/webhook`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ type: "test" }),
    });
    
    // Should return 400 (bad signature) not 404 or 500
    expect(response.status()).toBe(400);
  });

  test("static assets load (CSS/JS)", async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on("requestfailed", (request) => {
      if (request.url().includes("_next/")) {
        failedRequests.push(request.url());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    expect(failedRequests, `Failed static assets: ${failedRequests.join(", ")}`).toHaveLength(0);
  });
});

test.describe("Performance Smoke", () => {
  test("homepage loads under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    
    expect(loadTime, `Page load took ${loadTime}ms`).toBeLessThan(5000);
  });

  test("health endpoint responds under 3 seconds", async ({ request }) => {
    const start = Date.now();
    await request.get(`${BASE_URL}/api/health`);
    const responseTime = Date.now() - start;
    
    expect(responseTime, `Health check took ${responseTime}ms`).toBeLessThan(3000);
  });
});
