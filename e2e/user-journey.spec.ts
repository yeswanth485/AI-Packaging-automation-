import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Test: Complete User Journey
 * Tests the primary workflow: Registration → Login → Upload CSV → View Results
 */

test.describe('Complete User Journey', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('should complete full user workflow', async ({ page }) => {
    // Step 1: Navigate to home page
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Packaging Optimizer/);

    // Step 2: Register new user
    await page.click('text=Sign up');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Create account")');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Step 3: Navigate to Box Catalog and add boxes
    await page.click('text=Box Catalog');
    await page.waitForURL('**/boxes');

    // Add first box
    await page.click('button:has-text("Add Box")');
    await page.fill('input[name="name"]', 'Small Box');
    await page.fill('input[name="length"]', '12');
    await page.fill('input[name="width"]', '10');
    await page.fill('input[name="height"]', '8');
    await page.fill('input[name="maxWeight"]', '10');
    await page.fill('input[name="cost"]', '2.50');
    await page.click('button:has-text("Create")');

    // Wait for success message
    await expect(page.locator('text=Box created successfully')).toBeVisible();

    // Add second box
    await page.click('button:has-text("Add Box")');
    await page.fill('input[name="name"]', 'Medium Box');
    await page.fill('input[name="length"]', '20');
    await page.fill('input[name="width"]', '16');
    await page.fill('input[name="height"]', '12');
    await page.fill('input[name="maxWeight"]', '20');
    await page.fill('input[name="cost"]', '4.00');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Box created successfully')).toBeVisible();

    // Step 4: Navigate to Simulation
    await page.click('text=Simulation');
    await page.waitForURL('**/simulation');

    // Step 5: Upload CSV file
    const csvPath = path.join(__dirname, 'fixtures', 'sample-orders.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for upload to complete
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });

    // Step 6: Process simulation
    await page.click('button:has-text("Process Simulation")');

    // Wait for processing to complete (may take a few seconds)
    await expect(page.locator('text=Simulation completed')).toBeVisible({ timeout: 30000 });

    // Step 7: Verify results are displayed
    await expect(page.locator('text=Baseline Cost')).toBeVisible();
    await expect(page.locator('text=Optimized Cost')).toBeVisible();
    await expect(page.locator('text=Total Savings')).toBeVisible();

    // Verify savings percentage is displayed
    const savingsElement = page.locator('[data-testid="savings-percentage"]');
    await expect(savingsElement).toBeVisible();

    // Step 8: Download PDF report
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF Report")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');

    // Step 9: Navigate to Analytics
    await page.click('text=Analytics');
    await page.waitForURL('**/analytics');

    // Verify charts are rendered
    await expect(page.locator('[data-testid="box-usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-trend-chart"]')).toBeVisible();

    // Step 10: Check Dashboard KPIs
    await page.click('text=Dashboard');
    await page.waitForURL('**/dashboard');

    // Verify KPI cards show data
    await expect(page.locator('[data-testid="total-orders"]')).toContainText('10');
    await expect(page.locator('[data-testid="total-savings"]')).not.toContainText('$0');

    // Step 11: Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    await page.waitForURL('/');
  });

  test('should handle login with existing user', async ({ page }) => {
    // This test assumes the user from the previous test exists
    await page.goto('/login');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign in")');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/register');

    // Try to submit with empty fields
    await page.click('button:has-text("Create account")');
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();

    // Try with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'short');
    await page.click('button:has-text("Create account")');
    
    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });
});
