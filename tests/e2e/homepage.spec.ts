import { test, expect } from '@playwright/test';

test.describe('PPH Capacity Management Homepage', () => {
  test('should display the Paris Mechanical logo', async ({ page }) => {
    await page.goto('/');

    // Check if the logo is visible
    const logo = page.locator('img[alt="Paris Mechanical"]');
    await expect(logo).toBeVisible();
  });

  test('should have correct hero text', async ({ page }) => {
    await page.goto('/');

    // Check for the main heading
    await expect(page.locator('h1')).toContainText('Capacity Management System');

    // Check for the subtitle
    await expect(page.locator('text=/Streamline operations/')).toBeVisible();
  });

  test('should display stats tiles', async ({ page }) => {
    await page.goto('/');

    // Check that stats are visible
    await expect(page.locator('text=/Active Projects/')).toBeVisible();
    await expect(page.locator('text=/Team Members/')).toBeVisible();
    await expect(page.locator('text=/Utilization Rate/')).toBeVisible();
    await expect(page.locator('text=/Revenue YTD/')).toBeVisible();
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/');

    // Click on View Projects button
    await page.click('text=/View Projects/');

    // Should navigate to projects page
    await expect(page).toHaveURL(/.*projects/);

    // Projects page should load
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');

    // Check for feature cards
    const features = [
      'Project Management',
      'Capacity Planning',
      'Financial Dashboard',
      'Performance Metrics',
      'Employee Management',
      'Reports & Analytics'
    ];

    for (const feature of features) {
      await expect(page.locator(`text=/${feature}/`)).toBeVisible();
    }
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Test navigation to Capacity page
    await page.click('text=/Capacity Planning/');
    await expect(page).toHaveURL(/.*capacity/);

    // Go back to home
    await page.goto('/');

    // Test navigation to Financial page
    await page.click('text=/Financial Dashboard/');
    await expect(page).toHaveURL(/.*financial/);
  });
});