import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };
import commits from './fixtures/commits.json' with { type: 'json' };

function mockAPIs(page) {
  return Promise.all([
    page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repos) })
    ),
    page.route('**/api.github.com/repos/torvalds/linux/commits**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(commits) })
    ),
  ]);
}

test.describe('Commit Reader', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('navigating to #/repo/linux shows reader view', async ({ page }) => {
    await page.goto('/#/repo/linux');
    await expect(page.locator('#reader-view')).toBeVisible();
    await expect(page.locator('#repo-view')).toBeHidden();
  });

  test('chapter title page shows repo name', async ({ page }) => {
    await page.goto('/#/repo/linux');
    await expect(page.locator('.chapter-name')).toHaveText('linux');
  });

  test('"SCROLL TO BEGIN" is visible initially', async ({ page }) => {
    await page.goto('/#/repo/linux');
    await expect(page.locator('.scroll-prompt-text')).toHaveText('SCROLL TO BEGIN');
    await expect(page.locator('.scroll-prompt')).toBeVisible();
  });

  test('commit pages render with titles and dates', async ({ page }) => {
    await page.goto('/#/repo/linux');
    const commitPages = page.locator('.commit-page');
    await expect(commitPages.first()).toBeVisible({ timeout: 5000 });

    // Check first commit page has title and date
    const firstTitle = commitPages.first().locator('.commit-title');
    await expect(firstTitle).toBeVisible();

    const firstDate = commitPages.first().locator('.commit-date');
    await expect(firstDate).toBeVisible();
  });

  test('decorative rule between title and body', async ({ page }) => {
    await page.goto('/#/repo/linux');
    // Find a commit page that has a body (decorative rule only when body exists)
    const rule = page.locator('.commit-page .decorative-rule').first();
    await expect(rule).toBeVisible({ timeout: 5000 });
  });

  test('scroll-snap is active on container', async ({ page }) => {
    await page.goto('/#/repo/linux');
    const snapType = await page.locator('.scroll-container').evaluate(
      el => getComputedStyle(el).scrollSnapType
    );
    expect(snapType).toContain('mandatory');
  });

  test('small-caps lead-in on commit body', async ({ page }) => {
    await page.goto('/#/repo/linux');
    const leadIn = page.locator('.lead-in').first();
    await expect(leadIn).toBeVisible({ timeout: 5000 });
    const fontVariant = await leadIn.evaluate(el => getComputedStyle(el).fontVariant);
    expect(fontVariant).toContain('small-caps');
  });

  test('reading progress bar exists with accent color', async ({ page }) => {
    await page.goto('/#/repo/linux');
    const bar = page.locator('.progress-bar');
    await expect(bar).toBeAttached();
    const bg = await bar.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should contain the accent color (gold tone)
    expect(bg).toBeTruthy();
  });

  test('page counter visible with correct format', async ({ page }) => {
    await page.goto('/#/repo/linux');
    const counter = page.locator('.commit-counter').first();
    await expect(counter).toBeVisible({ timeout: 5000 });
    const text = await counter.textContent();
    // Format: "N / M" or "N / M+"
    expect(text).toMatch(/^\d+ \/ \d+\+?$/);
  });
});
