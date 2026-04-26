# Task Plan — linus-mind MVP

## In Progress

## Backlog

### Phase 5 — Routing + navigation
- [ ] Implement hash routing in `js/app.js`: parse `#/` → repo list, `#/repo/{name}` → reader. Listen to `hashchange`. On route change: outgoing view fades out (opacity → 0, 250ms), then hidden. Incoming view fades in. On initial load, read hash and route. Implement reading position memory: save scroll position on leaving reader, restore on return to same repo. Cache repo list in DOM — don't re-render on back.
- [ ] Add keyboard navigation: `keydown` listener. In reader view: `ArrowDown`/`Space`/`PageDown` → `scrollBy` one viewport height (triggers snap). `ArrowUp`/`PageUp` → scroll up one viewport. `Escape`/`Backspace` → navigate to `#/`. Prevent default on Space (don't scroll the page normally). Only active when reader view is visible.
- [ ] Write `tests/e2e/navigation.spec.js`: mock API. Tests: back button returns to repo list, direct URL `#/repo/linux` loads reader on fresh load, browser back button works (test with `page.goBack()`), Escape key navigates back, repo list not re-fetched on back (mock should only be intercepted once for repos), view transitions have opacity change.

### Phase 6 — Responsive polish + final QA
- [ ] Mobile polish: test at 375px width (iPhone SE). Verify every font size matches design.md mobile column. Check: tap targets ≥ 44px, `safe-area-inset` padding on notched devices, `dvh` used everywhere, no horizontal overflow, hero is compact, commit page padding is 64px top. Fix any issues found.
- [ ] Desktop polish: test at 1440px. Verify: content centered at 42rem max (38rem reading column), full-bleed hover on repo cards works, keyboard nav works, scroll snap feels smooth with trackpad, progress bar updates smoothly, top bar auto-hide is fluid. Fix any issues found.
- [ ] Dark mode polish: test both views in dark mode. Verify: all colors match design.md §3 dark mode values, `theme-color` meta updates, no elements using hardcoded light colors, selection color works, dividers are visible but subtle, progress bar and spinner accent is correct. Fix any issues found.
- [ ] Write `tests/e2e/responsive.spec.js`: iPhone 13 viewport — content fills width, font-size ≥ 14px on body text, tap targets ≥ 44px (back button, repo cards). Desktop 1440px — content centered with max-width, repo card hover changes background. Dark mode (`colorScheme: 'dark'`) — background color matches dark `--bg`. Reduced motion — check that transition durations are near zero.
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

