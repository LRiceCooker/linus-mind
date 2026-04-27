import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };
import commits from './fixtures/commits.json' with { type: 'json' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'X-RateLimit-Remaining, X-RateLimit-Reset, ETag, Link',
};

test.describe('Caching & Rate Limit', () => {

  test('repos fetched once, second navigation returns cached', async ({ page }) => {
    let repoCallCount = 0;
    await page.route('**/api.github.com/users/torvalds/repos**', (route) => {
      repoCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(repos),
      });
    });
    await page.route('**/api.github.com/repos/torvalds/*/commits**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(commits),
      })
    );

    await page.goto('http://localhost:3000/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Navigate to reader
    await page.locator('.repo-card').first().click();
    await expect(page.locator('#reader-view')).toBeVisible();

    // Go back
    await page.locator('.back-button').click();
    await expect(page.locator('#repo-view')).toBeVisible();
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Repos API should be called only once — reader uses sessionStorage cache
    expect(repoCallCount).toBe(1);
  });

  test('conditional request with If-None-Match returns 304, cached data still displays', async ({ page }) => {
    let requestCount = 0;
    let secondRequestHeaders = null;

    await page.route('**/api.github.com/users/torvalds/repos**', (route) => {
      requestCount++;
      const headers = route.request().headers();
      if (headers['if-none-match']) {
        secondRequestHeaders = headers;
        route.fulfill({ status: 304, body: '' });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify(repos),
          headers: {
            'Content-Type': 'application/json',
            'ETag': '"test-etag-123"',
            ...CORS_HEADERS,
          },
        });
      }
    });

    // First load — gets 200 + ETag
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.repo-card').first()).toBeVisible();
    expect(requestCount).toBe(1);

    // Expire the TTL by backdating the timestamp
    await page.evaluate(() => {
      const key = 'linus-mind:repos';
      const cached = JSON.parse(sessionStorage.getItem(key));
      cached.timestamp = Date.now() - 11 * 60 * 1000;
      sessionStorage.setItem(key, JSON.stringify(cached));
    });

    // Reload — stale cache triggers conditional request
    await page.reload();
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Second request should have used If-None-Match
    expect(requestCount).toBe(2);
    expect(secondRequestHeaders).not.toBeNull();
    expect(secondRequestHeaders['if-none-match']).toBe('"test-etag-123"');

    // Data still displays correctly from cache
    await expect(page.locator('.repo-name').first()).toHaveText('linux');
  });

  test('rate-limit warning bar appears when remaining <= 5', async ({ page }) => {
    await page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify(repos),
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '3',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          ...CORS_HEADERS,
        },
      })
    );

    await page.goto('http://localhost:3000/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    const bar = page.locator('#rate-limit-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('GitHub API limit nearly reached');
  });

  test('rate-limit exhausted shows reset time, no further API calls', async ({ page }) => {
    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    let commitCallCount = 0;

    await page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify(repos),
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTime),
          ...CORS_HEADERS,
        },
      })
    );
    await page.route('**/api.github.com/repos/torvalds/*/commits**', (route) => {
      commitCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(commits),
      });
    });

    await page.goto('http://localhost:3000/');
    await expect(page.locator('.repo-card').first()).toBeVisible();

    const bar = page.locator('#rate-limit-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('GitHub API limit reached');
    await expect(bar).toContainText('resets at');

    // Navigate to a repo — commits should NOT be fetched (remaining=0, no cache)
    await page.locator('.repo-card').first().click();
    await expect(page.locator('#reader-view')).toBeVisible();

    // No commits API call should have been made
    expect(commitCallCount).toBe(0);
  });

  test('stale repos cache triggers re-fetch, not stale read', async ({ page }) => {
    let repoCallCount = 0;
    await page.route('**/api.github.com/users/torvalds/repos**', (route) => {
      repoCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(repos),
      });
    });

    await page.goto('http://localhost:3000/');
    await expect(page.locator('.repo-card').first()).toBeVisible();
    expect(repoCallCount).toBe(1);

    // Expire the TTL
    await page.evaluate(() => {
      const key = 'linus-mind:repos';
      const cached = JSON.parse(sessionStorage.getItem(key));
      cached.timestamp = Date.now() - 11 * 60 * 1000;
      sessionStorage.setItem(key, JSON.stringify(cached));
    });

    // Reload — stale cache should trigger a re-fetch
    await page.reload();
    await expect(page.locator('.repo-card').first()).toBeVisible();

    // Should have been called twice
    expect(repoCallCount).toBe(2);
  });

  test('commits cache survives back-and-forth navigation', async ({ page }) => {
    let commitCallCount = 0;
    await page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(repos),
      })
    );
    await page.route('**/api.github.com/repos/torvalds/*/commits**', (route) => {
      commitCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(commits),
      });
    });

    // Navigate to reader
    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });
    expect(commitCallCount).toBe(1);

    // Go back
    await page.locator('.back-button').click();
    await expect(page.locator('#repo-view')).toBeVisible();

    // Navigate to same repo again
    await page.locator('.repo-card').first().click();
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Commits mock should only have been called once
    expect(commitCallCount).toBe(1);
  });

});
