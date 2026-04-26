# Task Plan — linus-mind MVP

## In Progress in `renderCommitPage`, pass raw commit body through `typeset()`, set body via `innerHTML`. Apply small-caps lead-in AFTER typesetting — target the first `<p>` element's first text node. Verify decorative rule, metadata, page counter all still work. Test with a few real commit messages visually.

## Backlog in `renderCommitPage`, pass raw commit body through `typeset()`, set body via `innerHTML`. Apply small-caps lead-in AFTER typesetting — target the first `<p>` element's first text node. Verify decorative rule, metadata, page counter all still work. Test with a few real commit messages visually.
- [ ] Write `tests/e2e/typography.spec.js` with mock commits containing Linus-style text. 14 tests: (1) curly double quotes, (2) em dash from `--`, (3) ellipsis from `...`, (4) `'function_name()'` → `<code>`, (5) TAB-indented lines → `<pre class="code-block">`, (6) `*emphasis*` → `<em>`, (7) email `> quote` → `<blockquote>`, (8) `(a) item` lettered list → `<ol>`, (9) git trailers → `.commit-trailers` with no email addresses, (10) `<script>` escaped (XSS), (11) `NOTE!` → `.callout`, (12) `.. continuation` → `.continuation`, (13) separate `<p>` on double newlines, (14) code block preserves indentation.
- [ ] Implement reading progress persistence with `localStorage`. (1) Create a small module or functions in `js/app.js` for `saveProgress(repo, { commitIndex, page, totalLoaded })` and `loadProgress(repo)`. Storage key: `linus-mind:progress`, value is a JSON object keyed by repo name (see `ralph/specs/project.md` "Reading progress persistence" for full schema). (2) Save progress on each scroll snap — when IntersectionObserver detects a new commit page is active, update `commitIndex`. Debounce `localStorage` writes to max 1/second. Also save on `beforeunload`. (3) On entering a repo with saved progress: fetch commits up to saved `page` (sequential fetches), render all, then `scrollTo` the saved `commitIndex` element with `behavior: 'instant'`. (4) On repo list, show "page N" in italic tertiary below the meta row for repos with saved progress. (5) On app load, clean up entries older than 30 days and cap at 20 entries (remove oldest).
- [ ] Write E2E tests for reading progress in `tests/e2e/progress.spec.js`. Tests: (1) After scrolling to commit 3, leaving, and returning to same repo — reader starts at commit 3 (mock localStorage). (2) Repo list shows "page N" indicator for repos with saved progress. (3) Fresh repo with no saved progress starts at chapter title page. (4) Progress survives page reload (set localStorage before navigating). (5) Old entries (>30 days) are cleaned up on load.
- [ ] Final QA pass: run full Playwright suite, fix any regressions or parser edge cases.

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
- [x] Final QA pass: all 33 tests passing across repos, reader, navigation, and responsive suites
- [x] Upgrade caching in `js/github.js` — ETag conditional requests + TTL + rate-limit monitoring
- [x] Add rate-limit warning bar to UI
- [x] Write E2E tests for caching + rate-limit in `tests/e2e/caching.spec.js`
- [x] Refactor home page to scroll-snap layout
- [x] Skip commits with no message body in the reader
- [x] Create `js/typography.js` — the core typesetting module
- [x] Add all typography CSS to `css/style.css`
- [x] Integrate typography parser into `js/ui.js`

