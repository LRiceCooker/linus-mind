# Task Plan — linus-mind MVP

## In Progress

## Backlog

### Phase 6 — Responsive polish + final QA
- [ ] Final QA pass: run full Playwright suite (`npx playwright test`). Manually verify: smooth font loading (no FOUT flash), no console errors, rate limit message works, empty repo handling, ornamental dots render correctly, small-caps lead-in looks good, reading position restores on back-and-forth navigation. Fix any remaining issues.

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

