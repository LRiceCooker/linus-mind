# Task Plan — linus-mind MVP

## In Progress

## Backlog

### Phase 4 — Commit reader view
- [ ] Build commit page rendering in `js/ui.js`: `renderCommitPage(commit, index, total, hasMore)` creates an `<article>` with: commit title (`<h2>`, serif bold), decorative rule (3rem centered, 1px, only if body exists), commit body (serif regular, `pre-wrap`, with small-caps lead-in on first 3-4 words via `<span class="lead-in">`), metadata footer (date left, SHA right), page counter. The lead-in: extract text up to first comma/period/colon/dash or first 4 words, wrap in span. Follow design.md §6.4 exactly for all sizes, weights, spacing.
- [ ] Build commit reader CSS: scroll container (`100dvh`, `scroll-snap-type: y mandatory`, `overscroll-behavior-y: contain`), commit page (flex column, `min-height: 100dvh`, `scroll-snap-align: start`), reading column (`max-width: 38rem`, centered), decorative rule, small-caps lead-in (`font-variant: small-caps`, weight 600, `letter-spacing: 0.05em`), commit entry animation (opacity 0 + translateY 12px → visible class adds opacity 1 + translateY 0, transition 400ms ease-out), chapter title page styles. Every value from design.md §6.3, §6.4, §8.
- [ ] Build the top bar in HTML/CSS: fixed, 48px, `--bg-elevated` + `backdrop-filter: blur(16px)`, back button (`←` in serif, 44×44 tap target, hover/active/focus-visible states), repo name (Inter 500, secondary, truncated). Add `env(safe-area-inset-top)` padding for notched phones. Follow design.md §6.5 exactly.
- [ ] Build the reading progress bar: fixed at top, `z-index: 200`, 2px height, `--accent` at 50% opacity, width based on `currentCommitIndex / totalCommits * 100%`, transition `width 300ms ease-out`. Only visible in reader view. Follow design.md §6.6.
- [ ] Implement commit data loading and scroll logic in `js/app.js`: on route `#/repo/{name}`, render chapter title page as first snap point, then fetch commits page 1, reverse to chronological, render pages. Set up IntersectionObserver on each commit page to add `.visible` class (entry animation). Set up infinite scroll: detect when user nears the second-to-last page, fetch next batch, sort all by date, append new pages without scroll jump. Update progress bar width on scroll. Store scroll position per repo in a Map for reading position memory.
- [ ] Implement top bar auto-hide: track `lastScrollTop` in scroll listener (throttled via `requestAnimationFrame`). If scrolling down > 80px from top → hide (opacity 0, translateY -100%, pointer-events none). If scrolling up → show. Transition 300ms ease. On mobile, threshold is 50px.
- [ ] Write `tests/e2e/reader.spec.js`: mock API. Tests: navigate to `#/repo/linux` shows reader, chapter title page visible with repo name and "SCROLL TO BEGIN", commit pages render with titles and dates, decorative rule between title and body, scroll-snap active on container (check computed style), small-caps lead-in on first commit body, reading progress bar exists with accent color, page counter visible with correct format.

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

