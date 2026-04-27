# Task Plan — linus-mind

## In Progress


## Backlog

### Bugfix — Wikipedia link detection overhaul
- [ ] Add GitHub as a secondary source for code-specific terms. In `js/wikipedia.js`, if a candidate word looks like a project/tool name (CamelCase, ALL_CAPS, or hyphenated like `RP2354A`) and Wikipedia returns 404, try a GitHub search: `https://api.github.com/search/repositories?q={word}&per_page=1`. If the top result has >100 stars and its `name` matches the word (case-insensitive), use the repo URL as the link instead. Style these links the same as wiki links but add a subtle class `.github-link` for potential future differentiation. Cache GitHub results in the same localStorage cache as Wikipedia results. Respect the existing rate-limit/backoff logic for GitHub API too.

### Bugfix — Typography parser improvements
- [ ] Fix NOTE/NOTE! callout detection in `js/typography.js` step 7. Current regex `^(NOTE!|NOTE:)` only matches at the START of a line. But Linus sometimes uses NOTE inline or after brackets like `[ NOTE! ... ]` or indented. Also Linus sometimes writes `NOTE !` (with a space before the exclamation mark — French-style spacing). Fix: (a) Make the regex also match `NOTE !`, `NOTE!`, `NOTE:` that appear after `[ ` or whitespace, not just at line start. The pattern should be `NOTE\s?[!:]` to catch both `NOTE!` and `NOTE !` and `NOTE:`. Same for `IMPORTANT`, `WARNING`, `FIXME`, `TODO`. (b) Handle the `[ NOTE! ... ]` and `[ NOTE ! ... ]` bracket patterns — the whole bracketed section should be styled as a callout block (see next task for bracket handling).
- [ ] Add `[<TEXT>]` bracket annotation handling in `js/typography.js`. Linus uses `[ And again, just to clarify: ... ]` style annotations — text wrapped in square brackets with leading space. These are editorial asides/clarifications. Rules: (a) Detect lines starting with `[ ` (opening bracket + space) and ending with `]` (or spanning multiple lines until the closing `]`). (b) Wrap the content in `<span class="bracket-note">` (or `<aside class="bracket-note">`). (c) Style: slightly smaller font (`0.95em`), italic, `--text-secondary` color, left border 2px solid `--divider`, padding-left. (d) **DO NOT touch** mathematical/range notations like `[0,1]`, `[-1,1]`, `[1,2]`, `[0..99]` — these contain only numbers, commas, dots, and dashes with NO spaces after the opening bracket. Detection heuristic: if the character after `[` is a digit, `-`, or `.`, it's a mathematical notation → leave as-is. If it's a letter or space, it's an annotation → style it. (e) NOTE!/NOTE: can appear INSIDE brackets — apply callout styling to the NOTE keyword within the bracket-note.
- [ ] Add `@username` GitHub link detection in `js/typography.js`. Linus uses `@username` to reference GitHub users (e.g., `Reported-by: @zeelsheladiya`). Rules: (a) Detect `@[a-zA-Z0-9][-a-zA-Z0-9]*` patterns (GitHub username format: alphanumeric + hyphens). (b) Wrap in `<a class="github-mention" href="https://github.com/{username}" target="_blank" rel="noopener noreferrer">@{username}</a>`. (c) Don't match `@` inside email addresses (already stripped from trailers) or inside `<code>` blocks. (d) CSS: same subtle dotted underline style as wiki links and URLs. Add the CSS for `.github-mention` matching `.wiki-link` style.
- [ ] Add CSS for new typography elements to `css/style.css`: `.bracket-note` (font-size 0.95em, font-style italic, color `--text-secondary`, border-left 2px solid `--divider`, padding-left `--space-3`, margin `--space-3` 0), `.github-mention` (same style as `.wiki-link` — dotted underline, secondary color, hover accent).
- [ ] Write E2E tests in `tests/e2e/typography.spec.js` (add to existing suite): (a) `[ And again, just to clarify: ... ]` renders as `.bracket-note`, (b) `[-1,1]` is NOT wrapped in `.bracket-note` (math notation preserved), (c) `@zeelsheladiya` renders as `<a>` with href to GitHub profile, (d) `[ NOTE! ... ]` has both `.bracket-note` and `.callout` styling, (e) `NOTE!` inside regular text (not at line start) still gets `.callout` styling.

### Final QA
- [ ] Final QA pass: run full Playwright suite, verify Wikipedia links are more relevant (no false positives on common concepts), case-insensitive dedup works, bracket notes render correctly, @mentions are linked, NOTE! callouts work everywhere. Fix any regressions.

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
- [x] Fix reading progress persistence — IntersectionObserver tracks index, multi-page restore, immediate save on navigate/unload
- [x] Fix progress indicator — shows "commit N / M+ (X%)" on repo list and "N / M · X%" in reader counter
- [x] Fix text overflow on mobile — overflow-wrap on titles/body/code/lists, code block scroll hint, reading-column overflow:hidden, long-name class
- [x] Clickable URLs — typography step 13 outputs `<a>` tags with dotted underline, hover/focus states, E2E test
- [x] Wikipedia smart links — wordlist.js (3000 words), wikipedia.js (candidate detection, API lookup, cache, DOM enhancement), CSS, app.js integration, 6 E2E tests
- [x] Final QA pass: all 69 tests passing, flaky opacity test fixed with transition wait
- [x] Fix Wikipedia hyphenated word extraction — regex captures `copy-on-write`, `x86-64`, etc.; isCandidate accepts hyphenated terms; enhanceWithWikiLinks tries full form then individual parts
- [x] Fix case-insensitive deduplication in wikipedia.js — Map-based dedup by lowercase key (first-seen casing preserved), wrapWordInLink wraps ALL occurrences case-insensitively, cache keys normalized to lowercase
- [x] Improve relevance filtering in wikipedia.js — reject disambiguation pages, require tech keywords or wikibase_item for ALL_CAPS words, reduces false positives

