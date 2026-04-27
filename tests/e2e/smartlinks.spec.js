import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': '*',
};

// --- Test commit data per scenario ---

const wikiCommits = [{
  sha: 'sl_wiki_111122223333444455556666777788',
  commit: {
    message: 'Fix TLB invalidation\n\nThe TLB flush was missing on ARM processors when switching ACPI contexts.',
    author: { date: '2024-01-10T10:00:00Z' },
  },
}];

const wiktCommits = [{
  sha: 'sl_wikt_111122223333444455556666777788',
  commit: {
    message: 'Update POSIX compliance\n\nEnsure POSIX compatibility in the signal handler.',
    author: { date: '2024-01-10T10:00:00Z' },
  },
}];

const wdCommits = [{
  sha: 'sl_wd_1111222233334444555566667777888',
  commit: {
    message: 'Fix IOMMU mapping\n\nThe IOMMU remapping table was incorrectly initialized.',
    author: { date: '2024-01-10T10:00:00Z' },
  },
}];

const ghCommits = [{
  sha: 'sl_gh_1111222233334444555566667777888',
  commit: {
    message: 'Port from FreeBSD\n\nAdapt the FreeBSD driver implementation.',
    author: { date: '2024-01-10T10:00:00Z' },
  },
}];

const noResultCommits = [{
  sha: 'sl_none_11112222333344445555666677778',
  commit: {
    message: 'Fix XYZQW handling\n\nThe XYZQW subsystem was broken.',
    author: { date: '2024-01-10T10:00:00Z' },
  },
}];

// --- Helpers ---

function mockBaseAPIs(page, commits) {
  return Promise.all([
    page.route('**/api.github.com/users/torvalds/repos**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repos) })
    ),
    page.route('**/api.github.com/repos/torvalds/*/commits**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(commits) })
    ),
  ]);
}

function mockAllSourcesEmpty(page) {
  return Promise.all([
    page.route('**/en.wikipedia.org/api/rest_v1/page/summary/**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', headers: corsHeaders, body: '{}' })
    ),
    page.route('**/en.wiktionary.org/api/rest_v1/page/definition/**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', headers: corsHeaders, body: '{}' })
    ),
    page.route('**/www.wikidata.org/w/api.php**', (route) =>
      route.fulfill({
        status: 200, contentType: 'application/json', headers: corsHeaders,
        body: JSON.stringify({ search: [] }),
      })
    ),
    page.route('**/api.github.com/search/repositories**', (route) =>
      route.fulfill({
        status: 200, contentType: 'application/json', headers: corsHeaders,
        body: JSON.stringify({ total_count: 0, items: [] }),
      })
    ),
  ]);
}

// --- Tests ---

test.describe('Smart Links Resolution Chain', () => {

  test('word found on Wikipedia gets .wiki-link with Wikipedia URL', async ({ page }) => {
    await mockBaseAPIs(page, wikiCommits);
    await mockAllSourcesEmpty(page);

    // Override: Wikipedia returns article for TLB
    await page.route('**/en.wikipedia.org/api/rest_v1/page/summary/TLB', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          type: 'standard',
          title: 'Translation lookaside buffer',
          description: 'Computer memory cache',
          extract: 'A translation lookaside buffer is a memory cache in computer architecture.',
          wikibase_item: 'Q1142058',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Translation_lookaside_buffer' } },
        }),
      })
    );

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const wikiLink = page.locator('.commit-body .wiki-link').first();
    await expect(wikiLink).toBeVisible({ timeout: 10000 });
    await expect(wikiLink).toHaveText('TLB');
    const href = await wikiLink.getAttribute('href');
    expect(href).toContain('en.wikipedia.org');
  });

  test('word NOT on Wikipedia but found on Wiktionary gets .wiki-link with Wiktionary URL', async ({ page }) => {
    await mockBaseAPIs(page, wiktCommits);
    await mockAllSourcesEmpty(page);

    // Override: Wiktionary returns noun definition for POSIX
    await page.route('**/en.wiktionary.org/api/rest_v1/page/definition/POSIX', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify([{
          language: 'English',
          definitions: [{
            partOfSpeech: 'noun',
            definition: 'A family of standards for maintaining compatibility between operating systems.',
          }],
        }]),
      })
    );

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const link = page.locator('.commit-body .wiki-link').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await expect(link).toHaveText('POSIX');
    const href = await link.getAttribute('href');
    expect(href).toContain('en.wiktionary.org/wiki/POSIX');
  });

  test('word found on Wikidata with enwiki sitelink gets .wiki-link with Wikipedia URL', async ({ page }) => {
    await mockBaseAPIs(page, wdCommits);
    await mockAllSourcesEmpty(page);

    // Override: Wikidata returns entity for IOMMU with enwiki sitelink
    await page.route('**/www.wikidata.org/w/api.php**', (route) => {
      const url = route.request().url();
      if (url.includes('wbsearchentities') && url.includes('IOMMU')) {
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: corsHeaders,
          body: JSON.stringify({
            search: [{
              id: 'Q1142059',
              label: 'IOMMU',
              description: 'Memory management unit for I/O',
            }],
          }),
        });
      }
      if (url.includes('wbgetentities') && url.includes('Q1142059')) {
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: corsHeaders,
          body: JSON.stringify({
            entities: {
              Q1142059: {
                sitelinks: {
                  enwiki: { title: 'Input-output_memory_management_unit' },
                },
              },
            },
          }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: corsHeaders,
        body: JSON.stringify({ search: [] }),
      });
    });

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const link = page.locator('.commit-body .wiki-link').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await expect(link).toHaveText('IOMMU');
    const href = await link.getAttribute('href');
    expect(href).toContain('en.wikipedia.org/wiki/');
  });

  test('project-like word found on GitHub gets .github-link', async ({ page }) => {
    await mockBaseAPIs(page, ghCommits);
    await mockAllSourcesEmpty(page);

    // Override: GitHub search returns FreeBSD repo with >100 stars
    await page.route('**/api.github.com/search/repositories**', (route) => {
      const url = route.request().url();
      if (url.includes('FreeBSD') || url.includes('freebsd')) {
        return route.fulfill({
          status: 200, contentType: 'application/json', headers: corsHeaders,
          body: JSON.stringify({
            total_count: 1,
            items: [{
              name: 'FreeBSD',
              full_name: 'freebsd/FreeBSD',
              html_url: 'https://github.com/freebsd/FreeBSD',
              stargazers_count: 5000,
            }],
          }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', headers: corsHeaders,
        body: JSON.stringify({ total_count: 0, items: [] }),
      });
    });

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    const link = page.locator('.commit-body .github-link').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await expect(link).toHaveText('FreeBSD');
    const href = await link.getAttribute('href');
    expect(href).toContain('github.com/freebsd/FreeBSD');
  });

  test('word not found on any source gets no link', async ({ page }) => {
    await mockBaseAPIs(page, noResultCommits);
    await mockAllSourcesEmpty(page);

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(3000);

    const count = await page.locator('.commit-body .wiki-link').count();
    expect(count).toBe(0);
    const ghCount = await page.locator('.commit-body .github-link').count();
    expect(ghCount).toBe(0);
  });

  test('all sources rate-limited — no crash, text displays normally', async ({ page }) => {
    await mockBaseAPIs(page, wikiCommits);

    // ALL sources return 429
    await page.route('**/en.wikipedia.org/**', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', headers: corsHeaders, body: '{}' })
    );
    await page.route('**/en.wiktionary.org/**', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', headers: corsHeaders, body: '{}' })
    );
    await page.route('**/www.wikidata.org/**', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', headers: corsHeaders, body: '{}' })
    );
    await page.route('**/api.github.com/search/repositories**', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', headers: corsHeaders, body: '{}' })
    );

    await page.goto('http://localhost:3000/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });

    // Text still displays
    const body = page.locator('.commit-body').first();
    await expect(body).toBeVisible();
    const text = await body.textContent();
    expect(text).toContain('TLB');

    // No links created
    await page.waitForTimeout(2000);
    const count = await page.locator('.commit-body .wiki-link').count();
    expect(count).toBe(0);
  });
});
