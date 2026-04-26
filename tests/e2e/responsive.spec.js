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

test.describe('Mobile — iPhone 13', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('content fills width', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('body text font-size >= 14px', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const bodyFontSize = await page.locator('.commit-body').first().evaluate(
      el => parseFloat(getComputedStyle(el).fontSize)
    );
    expect(bodyFontSize).toBeGreaterThanOrEqual(14);
  });

  test('back button tap target >= 44px', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/#/repo/linux');
    await expect(page.locator('.back-button')).toBeVisible();

    const size = await page.locator('.back-button').evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  });

  test('repo cards are tappable links', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    const card = page.locator('.repo-card').first();
    await expect(card).toBeVisible();

    const height = await card.evaluate(el => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Desktop — 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('content centered with max-width', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    const repoListWidth = await page.locator('.repo-list').evaluate(
      el => el.getBoundingClientRect().width
    );
    // 42rem = 672px max, should be less than viewport
    expect(repoListWidth).toBeLessThan(1440);
  });

  test('repo card hover changes background', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    const card = page.locator('.repo-card').first();
    await expect(card).toBeVisible();

    const bgBefore = await card.evaluate(el => getComputedStyle(el).backgroundColor);
    await card.hover();
    // Allow transition time
    await page.waitForTimeout(300);
    const bgAfter = await card.evaluate(el => getComputedStyle(el).backgroundColor);

    expect(bgBefore).not.toBe(bgAfter);
  });
});

test.describe('Dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('background color matches dark --bg', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.hero-title')).toBeVisible();

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // #1a1916 = rgb(26, 25, 22)
    expect(bg).toBe('rgb(26, 25, 22)');
  });

  test('text color matches dark --text', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.hero-title')).toBeVisible();

    const color = await page.locator('.hero-title').evaluate(
      el => getComputedStyle(el).color
    );
    // #d9d4ca = rgb(217, 212, 202)
    expect(color).toBe('rgb(217, 212, 202)');
  });
});

test.describe('Reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('transitions are near zero', async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/');
    await expect(page.locator('.hero-title')).toBeVisible();

    const duration = await page.locator('.view-visible').first().evaluate(
      el => getComputedStyle(el).transitionDuration
    );
    // Should be 0.01ms or 0s due to reduced motion
    const ms = parseFloat(duration);
    expect(ms).toBeLessThan(1);
  });
});
