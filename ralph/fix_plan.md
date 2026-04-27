# Task Plan — linus-mind

## In Progress


## Backlog

### Bugfix — Reading progress persistence
- [ ] Fix progress save/restore in `js/app.js`. Current bugs: (1) `currentCommitIndex` is only updated in `updateProgressBar` which depends on scroll events — if the user navigates away without scrolling, the index is 0. Fix: also update `currentCommitIndex` in the IntersectionObserver callback (the `entryObserver`) — when a commit page becomes visible, compute its index from its position among `.commit-page` elements. (2) The restore logic at line 356 only works if all commits up to `commitIndex` are already loaded (only page 1 is fetched). Fix: if `savedProgress.page > 1`, fetch pages 1 through `savedProgress.page` before rendering (await all fetches, concatenate, sort, render, THEN scroll to saved index). (3) In the `beforeunload` handler, force an immediate save (bypass debounce) by calling `saveProgress` directly with the current state. (4) Also save progress when the user navigates back (in `cleanupReader`, call `saveProgress` directly).

### Bugfix — Progress indicator on repo list
- [ ] Fix the progress indicator in `js/ui.js` `renderRepoList`. Currently it shows `page ${progress.page}` which is the API page number (meaningless to the user). Change to show: `commit ${progress.commitIndex + 1}` and if `progress.totalLoaded` is known, append ` / ${progress.totalLoaded}${hasMore ? '+' : ''}`. Also show a percentage: `(${Math.round((progress.commitIndex + 1) / progress.totalLoaded * 100)}%)`. Example: "commit 42 / 128+ (33%)". If `totalLoaded` is 0 or missing, show nothing. Use the same styling: Inter, `0.6875rem`, `--text-tertiary`, italic. Also add percentage to the commit reader page counter (in `renderCommitPage`): change format from `12 / 847` to `12 / 847 · 1%`. Update E2E tests for the new format.

### Bugfix — Text overflow and layout on mobile
- [ ] Fix text overflow issues while keeping the reading experience beautiful. The principle: **text should always wrap gracefully, never be cut brutally, and never cause horizontal scroll.** Different elements need different strategies:
  (1) **Commit title** (`.commit-title`): add `overflow-wrap: anywhere;` — this is the ONLY break property needed. It wraps long unbroken strings (like very long function names in titles) but only as a last resort. Do NOT use `word-break: break-all` (breaks normal words mid-syllable = ugly) or `hyphens: auto` (inserts random hyphens in technical words = confusing). If a title is still too long on mobile, the natural line-height and serif font handle multi-line gracefully.
  (2) **Commit body** (`.commit-body`, `.commit-body p`): already has `white-space: pre-wrap` which handles most wrapping. Add `overflow-wrap: anywhere;` as safety net for rare long unbroken strings. The body text at 17px on mobile with `line-height: 1.9` naturally wraps beautifully — don't touch that.
  (3) **Code blocks** (`.commit-body .code-block`): these are the ONE place where horizontal scroll is acceptable and expected. Keep `white-space: pre; overflow-x: auto;`. Add `-webkit-overflow-scrolling: touch;` for iOS. Add a subtle visual hint that it scrolls: a faint `box-shadow: inset -12px 0 8px -8px var(--bg)` on the right edge (fades the text into the background, signaling "there's more"). On mobile code blocks should have slightly smaller font: `font-size: 0.8em` instead of `0.85em`.
  (4) **Inline code** (`.commit-body code`): add `overflow-wrap: anywhere;` — this lets long inline code break if needed, but only at the boundary of the inline element, not in the middle of normal text. Do NOT use `break-all` — it would break short code like `ptr` across lines.
  (5) **Lists** (`.commit-body li`): add `overflow-wrap: anywhere;`. Lists with long technical content (paths, function names) should wrap within the list item, not overflow the reading column.
  (6) **URLs** (`.commit-body .url`): keep `word-break: break-all` — URLs are the exception where breaking anywhere is expected and looks natural.
  (7) **Chapter title repo name** (`.chapter-name`): add `overflow-wrap: anywhere;`. For repos with long hyphenated names like `subsurface-for-dirk`, the name should wrap naturally at hyphens first, then break if needed. On mobile, consider reducing font-size to `1.625rem` instead of `1.875rem` if the name is very long (detect via JS: if name.length > 20, add class `.long-name` that reduces size).
  (8) **Reading column** (`.reading-column`): add `overflow: hidden;` as the final safety net. This ensures that even if something unexpected overflows, it's clipped instead of causing horizontal scroll on the whole page.
  (9) **Global**: `body` should already have `overflow-x: hidden` — verify it's there.
  Test at 320px (iPhone SE) AND 375px (iPhone 13 mini) to verify everything looks beautiful — no awkward breaks, no horizontal scroll, code blocks scroll smoothly. Run Playwright mobile tests after.

### Feature — Clickable URLs in commit messages
- [ ] Update `js/typography.js` step 13 (URLs): change the output from `<span class="url">` to `<a class="url" href="{url}" target="_blank" rel="noopener noreferrer">`. The URL detection regex stays the same (`https?://[^\s)]+`). Update the CSS for `.commit-body .url` in `css/style.css`: add `text-decoration: none`, `border-bottom: 1px dotted var(--text-tertiary)`, `transition: border-color 200ms ease`. Add `:hover` state: `border-bottom-color: var(--accent)`. Add `:focus-visible` state: `outline: 2px solid var(--accent); outline-offset: 2px`. The style must be consistent with Wikipedia smart links (same dotted underline, same hover behavior). Update `tests/e2e/typography.spec.js` to verify URLs are now `<a>` tags with `target="_blank"` and `rel="noopener noreferrer"`.

### Feature — Wikipedia smart links
- [ ] Create `js/wordlist.js`: export a `Set` of the top ~3000 most common English words. Source the list from a public domain frequency list. Include common programming terms too (function, variable, return, class, type, null, void, etc.) to avoid false positives. Also include common git/development terms (commit, merge, branch, patch, fix, bug, test, etc.). The file will be ~25-30KB. Export as `export const COMMON_WORDS = new Set([...])`.
- [ ] Create `js/wikipedia.js` — the Wikipedia smart link module. Read `ralph/specs/wikipedia-links.md` for full spec. Implement: (1) `isCandidate(word)` — returns true if the word is NOT in COMMON_WORDS and matches heuristics (ALL_CAPS 3+ chars, CamelCase, capitalized mid-sentence). (2) `checkWikipedia(word)` — fetches `https://en.wikipedia.org/api/rest_v1/page/summary/{word}`, returns `{ exists, url, title }`. Caches results in localStorage (`linus-mind:wiki-cache`) with 7-day TTL, max 500 entries. (3) `enhanceWithWikiLinks(commitBodyElement)` — scans text nodes in the element, extracts candidate words, checks cache first, then fetches uncached candidates in batches of 5 with 200ms delay (max 20 lookups per page). Wraps matches in `<a class="wiki-link" href="..." target="_blank" rel="noopener noreferrer">`. On API error (429/5xx), back off for 60 seconds. All lookups are async and non-blocking — text renders first, links appear after.
- [ ] Add Wikipedia link CSS to `css/style.css`: `.commit-body .wiki-link` — `color: var(--text)`, `text-decoration: none`, `border-bottom: 1px dotted var(--text-tertiary)`, `transition: border-color 200ms ease`. Hover: `border-bottom-color: var(--accent)`. Focus-visible: `outline: 2px solid var(--accent), outline-offset: 2px`.
- [ ] Integrate Wikipedia links in `js/app.js`: after rendering each commit page (in `renderCommitPages` and `loadMoreCommits`), call `enhanceWithWikiLinks(commitBodyElement)` on each new commit page's `.commit-body` element. Ensure it runs AFTER typeset and lead-in are applied. The enhancement is fire-and-forget — no await needed, it updates the DOM asynchronously.
- [ ] Write `tests/e2e/wikipedia.spec.js`: mock the Wikipedia API via `page.route('**/en.wikipedia.org/**')`. Tests: (1) A word like "TLB" in a commit gets a `.wiki-link` element after render (mock Wikipedia returning 200). (2) A common English word like "the" does NOT get a wiki link. (3) A word with no Wikipedia article (mock 404) does NOT get a link. (4) Links have `target="_blank"` and `rel="noopener noreferrer"`. (5) Wiki link has dotted underline style. (6) On Wikipedia API error (mock 429), no crash, text still displays normally.

### Final QA
- [ ] Final QA pass: run full Playwright suite, verify all bugfixes (no gaps in scroll, correct chronological order, progress saves/restores correctly with correct page numbers and percentages, Wikipedia links appear on technical terms). Fix any regressions.

## Completed

- [x] Create `index.html`: semantic HTML structure, viewport meta, theme-color metas, preconnects, Google Fonts, skip-to-content, CSS/JS links
- [x] Create `css/style.css`: complete design system — colors (light + dark), font stacks, spacing tokens, base reset, selection, sr-only, reduced motion
- [x] Set up Playwright: config, fixtures (repos.json + commits.json), serve, chromium
- [x] Create `js/github.js`: fetchRepos + fetchCommits with sessionStorage/Map caching, Link header parsing, European date format
- [x] Create `js/ui.js`: renderRepoList (a tags, name/desc/meta), renderSpinner, renderError — all DOM nodes
- [x] Wire up repo list in js/app.js + repo list CSS (hero, cards, spinner, error, full-bleed hover)
- [x] Write tests/e2e/repos.spec.js: 9 tests all passing (title, dinkus, repo list, a tags, italic, meta, spinner, 403)
- [x] Build renderChapterTitle in ui.js + chapter title page CSS (scroll prompt with bounce + 4s fade)
- [x] Build renderCommitPage in ui.js: article with h2, decorative rule, body with small-caps lead-in, metadata footer, page counter
- [x] Build commit reader CSS: scroll snap container, commit page layout, reading column, decorative rule, lead-in, entry animation, metadata
- [x] Build top bar CSS (fixed 48px, backdrop blur, back button 44x44, auto-hide) + reading progress bar (2px accent, z-200)
- [x] Implement reader in app.js: data loading, IntersectionObserver entries, infinite scroll, progress bar, top bar auto-hide, scroll position memory
- [x] Write tests/e2e/reader.spec.js: 9 tests passing (reader view, chapter title, scroll prompt, commits, decorative rule, snap, lead-in, progress bar, counter)
- [x] Implement view transition animations (250ms fade out/in on route change)
- [x] Add keyboard navigation: ArrowDown/Space/PageDown, ArrowUp/PageUp, Escape/Backspace
- [x] Write tests/e2e/navigation.spec.js: 6 tests (back button, direct URL, browser back, Escape, cache, opacity)
- [x] Mobile polish: safe-area-inset-bottom on commit pages, overflow-x hidden, all mobile sizes verified
- [x] Desktop polish: 42rem max-width, 38rem reading column, full-bleed hover, all desktop sizes verified
- [x] Dark mode polish: all colors via CSS custom properties, dark scheme auto-switch verified
- [x] Write tests/e2e/responsive.spec.js: 9 tests (mobile width/font/tap targets, desktop max-width/hover, dark mode bg/text, reduced motion)
- [x] Upgrade caching in `js/github.js` — ETag conditional requests + TTL + rate-limit monitoring
- [x] Add rate-limit warning bar to UI
- [x] Write E2E tests for caching + rate-limit in `tests/e2e/caching.spec.js`
- [x] Refactor home page to scroll-snap layout
- [x] Skip commits with no message body in the reader
- [x] Create `js/typography.js` — the core typesetting module
- [x] Add all typography CSS to `css/style.css`
- [x] Integrate typography parser into `js/ui.js`
- [x] Write `tests/e2e/typography.spec.js` — 14 typography tests
- [x] Implement reading progress persistence with `localStorage`
- [x] Write E2E tests for reading progress in `tests/e2e/progress.spec.js`
- [x] Hide vertical scrollbar on desktop on all scroll-snap containers
- [x] Final QA pass: all 59 tests passing
- [x] Simplify empty commit filtering — combined title+body check, SHA deduplication, tests for merge commits and duplicates
- [x] Fix chronological order — sort by date after reverse on initial load, E2E test verifies oldest-first rendering

