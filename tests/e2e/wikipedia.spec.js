import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };

// Commits with words that should trigger Wikipedia lookups
const wikiCommits = [
  {
    sha: 'wiki111122223333444455556666777788889999',
    commit: {
      message: 'Fix TLB invalidation on context switch\n\nThe TLB flush was missing on ARM processors when switching between ACPI contexts. This caused Spectre-variant issues on Intel hardware.',
      author: { date: '2024-01-10T10:00:00Z' },
    },
  },
];

function mockAPIs(page) {
  return Promise.all([
    page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repos) })
    ),
    page.route('**/api.github.com/repos/torvalds/*/commits**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wikiCommits) })
    ),
    // Mock GitHub search API (used by smartlinks resolution chain fallback)
    page.route('**/api.github.com/search/repositories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ total_count: 0, items: [] }),
      })
    ),
  ]);
}

test.describe('Wikipedia Smart Links', () => {
  test('word like TLB gets a .wiki-link after render', async ({ page }) => {
    await mockAPIs(page);

    // Mock Wikipedia API — TLB returns a valid article
    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/TLB', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          type: 'standard',
          title: 'Translation lookaside buffer',
          description: 'Computer memory management hardware',
          extract: 'A translation lookaside buffer (TLB) is a memory cache used by the memory management hardware to improve virtual address translation speed in computer architecture.',
          wikibase_item: 'Q1142058',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Translation_lookaside_buffer' } },
        }),
      })
    );
    // Other Wikipedia lookups return 404
    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/**', (route) => {
      if (route.request().url().includes('/TLB')) return route.fallback();
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Wait for async wiki enhancement
    const wikiLink = page.locator('.commit-body .wiki-link').first();
    await expect(wikiLink).toBeVisible({ timeout: 10000 });
    await expect(wikiLink).toHaveText('TLB');
  });

  test('common English word does NOT get a wiki link', async ({ page }) => {
    await mockAPIs(page);

    // Block all Wikipedia calls — none should happen for common words
    let wikiCallCount = 0;
    await page.route('**/en.wikipedia.org/**', (route) => {
      wikiCallCount++;
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Wait a moment for any async enhancements to happen
    await page.waitForTimeout(2000);

    // Words like "the", "was", "on", "when" should NOT become wiki links
    const allLinks = await page.locator('.commit-body .wiki-link').allTextContents();
    const commonWords = ['the', 'was', 'on', 'when', 'between', 'caused', 'issues'];
    for (const w of commonWords) {
      expect(allLinks.map(l => l.toLowerCase())).not.toContain(w);
    }
  });

  test('word with no Wikipedia article does NOT get a link', async ({ page }) => {
    await mockAPIs(page);

    // All Wikipedia lookups return 404
    await page.route('**/en.wikipedia.org/**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    );

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Wait for async enhancements
    await page.waitForTimeout(2000);

    // No wiki links should exist
    const count = await page.locator('.commit-body .wiki-link').count();
    expect(count).toBe(0);
  });

  test('wiki links have target="_blank" and rel="noopener noreferrer"', async ({ page }) => {
    await mockAPIs(page);

    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/TLB', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          type: 'standard',
          title: 'Translation lookaside buffer',
          description: 'Computer memory management hardware',
          extract: 'A translation lookaside buffer (TLB) is a memory cache used by the memory management hardware to improve virtual address translation speed in computer architecture.',
          wikibase_item: 'Q1142058',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Translation_lookaside_buffer' } },
        }),
      })
    );
    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/**', (route) => {
      if (route.request().url().includes('/TLB')) return route.fallback();
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const wikiLink = page.locator('.commit-body .wiki-link').first();
    await expect(wikiLink).toBeVisible({ timeout: 10000 });
    await expect(wikiLink).toHaveAttribute('target', '_blank');
    await expect(wikiLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('wiki link has dotted underline style', async ({ page }) => {
    await mockAPIs(page);

    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/TLB', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          type: 'standard',
          title: 'Translation lookaside buffer',
          description: 'Computer memory management hardware',
          extract: 'A translation lookaside buffer (TLB) is a memory cache used by the memory management hardware to improve virtual address translation speed in computer architecture.',
          wikibase_item: 'Q1142058',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Translation_lookaside_buffer' } },
        }),
      })
    );
    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/**', (route) => {
      if (route.request().url().includes('/TLB')) return route.fallback();
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });

    await page.goto('http://localhost:3000/#/repo/linux');
    const wikiLink = page.locator('.commit-body .wiki-link').first();
    await expect(wikiLink).toBeVisible({ timeout: 10000 });

    const borderBottom = await wikiLink.evaluate(el => getComputedStyle(el).borderBottomStyle);
    expect(borderBottom).toBe('dotted');
  });

  test('word list loads and filters capitalized common English words', async ({ page }) => {
    // "Driver" is a common English word capitalized mid-sentence.
    // If the wordlist loaded correctly, "driver" is in the Set → isCandidate returns false → no wiki lookup.
    // If the wordlist FAILED to load (empty Set), "Driver" matches the capitalized pattern → becomes a candidate.
    const driverCommits = [
      {
        sha: 'driver11112222333344445555666677778888',
        commit: {
          message: 'Fix Driver initialization\n\nThe Driver module failed to start because of a missing Memory allocation in the Computer subsystem.',
          author: { date: '2024-02-01T10:00:00Z' },
        },
      },
    ];

    await page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repos) })
    );
    await page.route('**/api.github.com/repos/torvalds/*/commits**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(driverCommits) })
    );
    // Mock GitHub search API (smartlinks resolution chain fallback)
    await page.route('**/api.github.com/search/repositories**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ total_count: 0, items: [] }),
      })
    );

    // Track Wikipedia API calls — none should happen for "Driver", "Memory", "Computer"
    const wikiLookups = [];
    await page.route('**/en.wikipedia.org/**', (route) => {
      const url = route.request().url();
      const word = url.split('/page/summary/').pop();
      wikiLookups.push(decodeURIComponent(word));
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });

    // Verify the word list file is served and contains real data
    const wordListResponse = await page.request.get('http://localhost:3000/data/words.txt');
    expect(wordListResponse.status()).toBe(200);
    const wordListText = await wordListResponse.text();
    const wordCount = wordListText.split('\n').filter(Boolean).length;
    expect(wordCount).toBeGreaterThan(300000); // dwyl/english-words has ~370k words

    // Verify key words are in the list (trim + lowercase, same as the app code does)
    const words = new Set(wordListText.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
    expect(words.has('driver')).toBe(true);
    expect(words.has('memory')).toBe(true);
    expect(words.has('computer')).toBe(true);
    expect(words.has('the')).toBe(true);
    // These should NOT be in the dictionary (proper nouns / acronyms)
    expect(words.has('tlb')).toBe(false);
    expect(words.has('linux')).toBe(false);

    // Navigate to the reader
    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Wait for async wiki enhancement to finish
    await page.waitForTimeout(3000);

    // "Driver", "Memory", "Computer" should NOT have been looked up on Wikipedia
    // because they are common English words filtered by the loaded word list
    for (const w of ['Driver', 'Memory', 'Computer']) {
      expect(wikiLookups).not.toContain(w);
    }

    // No wiki links should exist (all words are common English)
    const count = await page.locator('.commit-body .wiki-link').count();
    expect(count).toBe(0);
  });

  test('on Wikipedia API error (429), no crash, text still displays', async ({ page }) => {
    await mockAPIs(page);

    // All Wikipedia calls return 429
    await page.route('**/en.wikipedia.org/**', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: '{}' })
    );

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Text should still display normally
    const body = page.locator('.commit-body').first();
    await expect(body).toBeVisible();
    const text = await body.textContent();
    expect(text).toContain('TLB');

    // No wiki links
    await page.waitForTimeout(1000);
    const count = await page.locator('.commit-body .wiki-link').count();
    expect(count).toBe(0);
  });
});
