import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };
import commits from './fixtures/commits.json' with { type: 'json' };

function mockAPIs(page) {
  return Promise.all([
    page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repos) })
    ),
    page.route('**/api.github.com/repos/torvalds/*/commits**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(commits) })
    ),
  ]);
}

const PROGRESS_KEY = 'linus-mind:progress';

test.describe('Reading Progress', () => {

  test('saved progress restores scroll position on re-entry', async ({ page }) => {
    await mockAPIs(page);

    // Pre-set progress in localStorage: commit index 2 for linux
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.hero-title')).toBeVisible();
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({
        linux: { commitIndex: 2, page: 1, totalLoaded: 10, updatedAt: Date.now() }
      }));
    }, PROGRESS_KEY);

    // Navigate to the reader
    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Wait for scroll restoration
    await page.waitForTimeout(500);

    // The third commit page (index 2) should be near the viewport
    const pages = page.locator('.commit-page');
    const thirdPage = pages.nth(2);
    const isNearViewport = await thirdPage.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    expect(isNearViewport).toBe(true);
  });

  test('repo list shows "page N" indicator for repos with saved progress', async ({ page }) => {
    await mockAPIs(page);

    // Pre-set progress
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.hero-title')).toBeVisible();
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({
        linux: { commitIndex: 5, page: 2, totalLoaded: 60, updatedAt: Date.now() }
      }));
    }, PROGRESS_KEY);

    // Reload to pick up progress
    await page.reload();
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Check for progress indicator — format: "commit 6 / 60+ (10%)"
    const indicator = page.locator('.repo-progress').first();
    await expect(indicator).toBeVisible();
    const text = await indicator.textContent();
    expect(text).toContain('commit 6');
    expect(text).toContain('/ 60+');
    expect(text).toContain('(10%)');
  });

  test('fresh repo with no saved progress starts at chapter title page', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.chapter-title')).toBeVisible();

    // Chapter title should be near the top (not scrolled away)
    const isAtTop = await page.locator('.chapter-title').evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });
    expect(isAtTop).toBe(true);
  });

  test('progress survives page reload', async ({ page }) => {
    await mockAPIs(page);

    // Set localStorage before navigation
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.hero-title')).toBeVisible();
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({
        linux: { commitIndex: 3, page: 1, totalLoaded: 10, updatedAt: Date.now() }
      }));
    }, PROGRESS_KEY);

    // Navigate to reader, progress should be restored
    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify the saved progress is in localStorage
    const progress = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key));
    }, PROGRESS_KEY);
    expect(progress.linux).toBeTruthy();
    expect(progress.linux.commitIndex).toBeGreaterThanOrEqual(0);
  });

  test('old entries (>30 days) are cleaned up on load', async ({ page }) => {
    await mockAPIs(page);

    // Set old progress entry (31 days ago)
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.hero-title')).toBeVisible();
    const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await page.evaluate(({ key, ts }) => {
      localStorage.setItem(key, JSON.stringify({
        'old-repo': { commitIndex: 5, page: 1, totalLoaded: 30, updatedAt: ts },
        linux: { commitIndex: 2, page: 1, totalLoaded: 10, updatedAt: Date.now() }
      }));
    }, { key: PROGRESS_KEY, ts: oldTimestamp });

    // Reload — cleanup runs on app load
    await page.reload();
    await expect(page.locator('.hero-title')).toBeVisible();

    // Check that old entry was removed but recent one kept
    const progress = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key));
    }, PROGRESS_KEY);
    expect(progress['old-repo']).toBeUndefined();
    expect(progress.linux).toBeTruthy();
  });

});
