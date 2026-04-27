import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };

function mockReposAPI(page, { delay = 0, status = 200 } = {}) {
  return page.route('**/api.github.com/users/torvalds/repos**', async (route) => {
    if (delay) await new Promise(r => setTimeout(r, delay));
    if (status !== 200) {
      return route.fulfill({ status, body: '{}', contentType: 'application/json' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(repos),
    });
  });
}

test.describe('Repository Index', () => {
  test('displays the title "linus-mind"', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.hero-title')).toHaveText('linus-mind');
  });

  test('displays the dinkus ornament', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    const dinkus = page.locator('.dinkus');
    await expect(dinkus).toBeVisible();
    await expect(dinkus).toContainText('·');
  });

  test('renders repo list from mock data', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    const cards = page.locator('.repo-card');
    await expect(cards).toHaveCount(4);
  });

  test('each repo has a name', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    const names = page.locator('.repo-name');
    await expect(names.first()).toBeVisible();
    await expect(names.first()).toHaveText('linux');
  });

  test('repos are <a> tags', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    const firstCard = page.locator('.repo-card').first();
    await expect(firstCard).toBeVisible();
    const tagName = await firstCard.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
  });

  test('description is in italic', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    const desc = page.locator('.repo-description').first();
    await expect(desc).toBeVisible();
    const tagName = await desc.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('em');
    const fontStyle = await desc.evaluate(el => getComputedStyle(el).fontStyle);
    expect(fontStyle).toBe('italic');
  });

  test('meta shows language', async ({ page }) => {
    await mockReposAPI(page);
    await page.goto('http://localhost:3000/');
    const meta = page.locator('.repo-meta').first();
    await expect(meta).toContainText('C');
  });

  test('spinner visible during loading', async ({ page }) => {
    await mockReposAPI(page, { delay: 2000 });
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.spinner')).toBeVisible();
  });

  test('shows error message on 403', async ({ page }) => {
    await mockReposAPI(page, { status: 403 });
    await page.goto('http://localhost:3000/');
    await expect(page.locator('.error-message')).toHaveText(
      'GitHub needs a moment. Come back shortly.'
    );
  });
});
