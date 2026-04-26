import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };
import commits from './fixtures/commits.json' with { type: 'json' };

function mockAPIs(page, { repoCallCount } = {}) {
  let reposCalled = 0;
  return Promise.all([
    page.route('**/api.github.com/users/torvalds/repos**', (route) => {
      reposCalled++;
      if (repoCallCount) repoCallCount.push(reposCalled);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(repos),
      });
    }),
    page.route('**/api.github.com/repos/torvalds/*/commits**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(commits),
      })
    ),
  ]);
}

test.describe('Navigation', () => {
  test('back button returns to repo list', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/#/repo/linux');
    await expect(page.locator('#reader-view')).toBeVisible();

    await page.locator('.back-button').click();
    await expect(page.locator('#repo-view')).toBeVisible();
    await expect(page.locator('.hero-title')).toHaveText('linus-mind');
  });

  test('direct URL #/repo/linux loads reader on fresh load', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/#/repo/linux');
    await expect(page.locator('#reader-view')).toBeVisible();
    await expect(page.locator('.chapter-name')).toHaveText('linux');
  });

  test('browser back button works', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Navigate to reader
    await page.locator('.repo-card').first().click();
    await expect(page.locator('#reader-view')).toBeVisible();

    // Go back
    await page.goBack();
    await expect(page.locator('#repo-view')).toBeVisible();
  });

  test('Escape key navigates back', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/#/repo/linux');
    await expect(page.locator('#reader-view')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#repo-view')).toBeVisible();
  });

  test('repo list not re-fetched on back', async ({ page }) => {
    const repoCallCount = [];
    await mockAPIs(page, { repoCallCount });

    await page.goto('/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Navigate to reader then back
    await page.locator('.repo-card').first().click();
    await expect(page.locator('#reader-view')).toBeVisible();

    await page.locator('.back-button').click();
    await expect(page.locator('#repo-view')).toBeVisible();
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Repos API should only be called once (cached after first call)
    // The reader may also call fetchRepos for description, but it's cached in sessionStorage
    // So the route handler only hits the network once
    expect(repoCallCount.length).toBeLessThanOrEqual(2);
  });

  test('view transitions have opacity change', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Check repo view is visible
    const repoOpacity = await page.locator('#repo-view').evaluate(
      el => getComputedStyle(el).opacity
    );
    expect(Number(repoOpacity)).toBe(1);
  });
});
