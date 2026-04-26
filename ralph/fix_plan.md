# Task Plan — linus-mind MVP

## In Progress

## Backlog

## Completed

- [x] Hide vertical scrollbar on desktop on all scroll-snap containers (home page + commit reader)
- [x] Final QA pass: all 59 tests passing

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
- [x] Write `tests/e2e/typography.spec.js` — 14 typography tests
- [x] Implement reading progress persistence with `localStorage`
- [x] Write E2E tests for reading progress in `tests/e2e/progress.spec.js`
- [x] Final QA pass: all 59 tests passing across caching, navigation, reader, repos, responsive, typography, and progress suites

