import { test, expect } from '@playwright/test';
import repos from './fixtures/repos.json' with { type: 'json' };
import commits from './fixtures/typography-commits.json' with { type: 'json' };

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

test.describe('Typography', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
    await page.goto('/#/repo/linux');
    await expect(page.locator('.commit-page').first()).toBeVisible({ timeout: 5000 });
  });

  test('curly double quotes', async ({ page }) => {
    const body = page.locator('.commit-body').first();
    const html = await body.innerHTML();
    expect(html).toContain('\u201C');
    expect(html).toContain('\u201D');
  });

  test('em dash from --', async ({ page }) => {
    const body = page.locator('.commit-body').first();
    const html = await body.innerHTML();
    expect(html).toContain('\u2014');
  });

  test('ellipsis from ...', async ({ page }) => {
    const body = page.locator('.commit-body').first();
    const html = await body.innerHTML();
    expect(html).toContain('\u2026');
  });

  test('single-quoted code becomes <code>', async ({ page }) => {
    const codeEls = page.locator('.commit-body code');
    const allCode = await codeEls.allTextContents();
    const hasFunc = allCode.some(t => t.includes('remote_repo_uptodate()'));
    expect(hasFunc).toBe(true);
  });

  test('TAB-indented lines become code block', async ({ page }) => {
    const codeBlock = page.locator('.commit-body .code-block').first();
    await expect(codeBlock).toBeVisible();
    const text = await codeBlock.textContent();
    expect(text).toContain('test-tlb');
  });

  test('*emphasis* becomes <em>', async ({ page }) => {
    const em = page.locator('.commit-body em').first();
    await expect(em).toBeVisible();
    const text = await em.textContent();
    expect(text).toBe('common');
  });

  test('email > quote becomes blockquote', async ({ page }) => {
    const quote = page.locator('.commit-body .email-quote').first();
    await expect(quote).toBeVisible();
    const text = await quote.textContent();
    expect(text).toContain('think we should fix');
  });

  test('(a) lettered list becomes <ol>', async ({ page }) => {
    const ol = page.locator('.commit-body ol').first();
    await expect(ol).toBeVisible();
    const items = ol.locator('li');
    await expect(items).toHaveCount(3);
  });

  test('git trailers in footer with no email addresses', async ({ page }) => {
    const trailers = page.locator('.commit-trailers').first();
    await expect(trailers).toBeVisible();
    const text = await trailers.textContent();
    expect(text).toContain('Signed-off-by');
    expect(text).toContain('Linus Torvalds');
    expect(text).not.toContain('@');
    expect(text).not.toContain('<');
  });

  test('<script> is escaped (XSS prevention)', async ({ page }) => {
    // The second commit has <script> in its body
    const body = page.locator('.commit-body').nth(1);
    const html = await body.innerHTML();
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('NOTE! becomes callout', async ({ page }) => {
    const callout = page.locator('.commit-body .callout').first();
    await expect(callout).toBeVisible();
    const text = await callout.textContent();
    expect(text).toContain('NOTE!');
  });

  test('.. continuation becomes styled span', async ({ page }) => {
    const cont = page.locator('.commit-body .continuation').first();
    await expect(cont).toBeVisible();
    const text = await cont.textContent();
    expect(text).toContain('at least if the local repository');
  });

  test('double newlines create separate <p> elements', async ({ page }) => {
    // Second commit has "First paragraph" and "Second paragraph"
    const body = page.locator('.commit-body').nth(1);
    const paragraphs = body.locator('p');
    const count = await paragraphs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('code block preserves indentation', async ({ page }) => {
    // Second commit (bbbb) has indented code with alignment
    const codeBlock = page.locator('.commit-body').nth(1).locator('.code-block');
    await expect(codeBlock).toBeVisible();
    const text = await codeBlock.textContent();
    // Verify the aligned spaces are preserved
    expect(text).toContain('line_one     = first');
    expect(text).toContain('line_two     = second');
  });

  test('URLs become clickable <a> tags', async ({ page }) => {
    // Third commit (cccc, last by date) has a URL
    const link = page.locator('.commit-body').nth(2).locator('.url').first();
    await expect(link).toBeVisible();
    const tagName = await link.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('href', 'https://lkml.org/lkml/2024/1/15/100');
  });
});
