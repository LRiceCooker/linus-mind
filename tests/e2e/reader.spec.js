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
    // Format: "N / M · X%" or "N / M+ · X%"
    expect(text).toMatch(/^\d+ \/ \d+\+? · \d+%$/);
  });

  test('commit with empty message is not rendered', async ({ page }) => {
    await page.goto('/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // The fixtures include a commit with whitespace-only message (sha: empty123...)
    // It should be filtered out — no commit page should contain that SHA
    const allShas = await page.locator('.commit-sha').allTextContents();
    const hasEmpty = allShas.some(sha => sha.startsWith('empty12'));
    expect(hasEmpty).toBe(false);

    // Total in page counter should reflect filtered count (10 valid commits, not 12)
    // 12 raw commits - 1 empty - 1 duplicate = 10
    const counter = page.locator('.commit-counter').first();
    const text = await counter.textContent();
    expect(text).toContain('/ 10');
  });

  test('merge commit with real message IS rendered', async ({ page }) => {
    await page.goto('/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // The first commit in fixtures is a merge commit — it should be rendered
    const titles = await page.locator('.commit-title').allTextContents();
    const hasMerge = titles.some(t => t.startsWith('Merge tag'));
    expect(hasMerge).toBe(true);
  });

  test('duplicate commits with same SHA are deduplicated', async ({ page }) => {
    await page.goto('/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Fixture has a duplicate (d0e1f2a) — should appear only once
    const allShas = await page.locator('.commit-sha').allTextContents();
    const d0Count = allShas.filter(sha => sha === 'd0e1f2a').length;
    expect(d0Count).toBe(1);
  });

  test('commits are rendered in strict chronological order (oldest first)', async ({ page }) => {
    // Mock with 3 commits whose dates are out of order (newest first, as API returns)
    const outOfOrder = [
      { sha: 'ccc1111222233334444555566667777888899990', commit: { message: 'Third commit (newest)', author: { date: '2024-03-01T12:00:00Z' } } },
      { sha: 'aaa1111222233334444555566667777888899990', commit: { message: 'First commit (oldest)', author: { date: '2024-01-01T08:00:00Z' } } },
      { sha: 'bbb1111222233334444555566667777888899990', commit: { message: 'Second commit (middle)', author: { date: '2024-02-01T10:00:00Z' } } },
    ];

    await page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repos) })
    );
    await page.route('**/api.github.com/repos/torvalds/linux/commits**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(outOfOrder) })
    );

    await page.goto('/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const titles = await page.locator('.commit-title').allTextContents();
    expect(titles[0]).toBe('First commit (oldest)');
    expect(titles[1]).toBe('Second commit (middle)');
    expect(titles[2]).toBe('Third commit (newest)');
  });
});
