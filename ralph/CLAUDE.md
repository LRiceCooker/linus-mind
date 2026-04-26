# Agent Context — linus-mind

## Project
A literary web reader for Linus Torvalds' commit messages. Each repo is a "chapter", each commit is a "page". The design language is editorial — like The Paris Review or a Penguin Classics paperback. Typography-driven, zero chrome, warm tones.

## Stack
- Pure HTML/CSS/JS (no framework, no build, no runtime dependencies)
- Google Fonts: Source Serif 4 (300, 400, 600, 700, italic) + Inter (400, 500)
- GitHub REST API v3 (public, no auth)
- Playwright (E2E tests)
- `serve` npm package (dev server for tests)
- Deployed on GitHub Pages

## Architecture
```
index.html              # Single page, semantic HTML
css/style.css           # Design system + all styles
js/app.js               # Routing, view switching, events, data orchestration
js/github.js            # GitHub API calls + caching (sessionStorage + in-memory)
js/ui.js                # DOM rendering functions (return DOM nodes, not innerHTML)
tests/e2e/
  playwright.config.js
  fixtures/             # Mock API data (repos.json, commits.json)
  repos.spec.js
  reader.spec.js
  navigation.spec.js
  responsive.spec.js
```

## Key design decisions
- **Source Serif 4 Light (300)** for display text (book title, chapter titles) — light weight at large sizes is more elegant than regular
- **Source Serif 4 italic** for repo descriptions — editorial "subtitle" feel
- **Small-caps lead-in** on commit body first line — classic New Yorker / Paris Review technique
- **Dinkus** (`·  ·  ·`) as section separators — book design convention, cleaner than `<hr>`
- **Chapter title page** as first snap point in reader — sets the reading mood before commits begin
- **Reading progress bar** (2px, accent, fixed top) — only accent-colored element on screen
- **European date format** ("15 March 2005") — more literary than "March 15, 2005"
- **No language color dots** — this is a book, not GitHub
- **38rem reading column** (not 40rem) — narrower is more comfortable for body text

## Technical decisions
- No auth token: 60 req/hour unauthenticated, enough for browsing
- Hash routing (`#/repo/linux`) for GitHub Pages compatibility
- Commits: fetched newest-first from API, reversed to chronological for display, sorted by date after each batch
- SessionStorage cache for repos, in-memory Map for commit pages
- IntersectionObserver for commit entry animations (not scroll events)
- `requestAnimationFrame` throttle for scroll-based top bar auto-hide
- DOM rendering via `document.createElement()` (not innerHTML) for security
- `font-display: swap` on Google Fonts — renders immediately with fallbacks

## API rate limit strategy
- 60 req/hour without token
- **ETag conditional requests**: every response's `ETag` is cached. On re-fetch, send `If-None-Match` — a `304` response is free (doesn't count against rate limit). This is the #1 lever.
- **Repos TTL**: sessionStorage cache stores `{ data, etag, timestamp }`. If within 10 minutes, serve from cache with no fetch. If stale, make a conditional request.
- **Commits**: in-memory Map stores `{ data, etag }`. No TTL needed — commit history is stable within a session.
- **Rate-limit headers**: read `X-RateLimit-Remaining` and `X-RateLimit-Reset` from every non-304 response. Export `getRateLimitInfo()` for the UI layer.
- When `remaining <= 5`: show a subtle warning bar. When `remaining === 0`: skip all fetches, serve from cache only.
- On 403: show friendly message, keep all cached content readable.
- See `ralph/specs/project.md` "Caching" section for the full spec.

## Learnings
- CSS specificity: ID selectors (#repo-view) override class selectors (.view-visible). Use class-based selectors for view transitions.
- Playwright `devices` presets include `defaultBrowserType` which can't be used inside `test.describe()`. Use explicit `viewport` + `isMobile` instead.
- Progress bar at 0% width is technically "hidden" to Playwright's `toBeVisible()`. Test for `toBeAttached()` + style checks instead.
- The `transitionend` event may not fire if the element was already hidden. Always add a setTimeout fallback.
- `prefers-color-scheme: dark` in CSS custom properties auto-switches all colors — no JS needed for dark mode.
- View transitions: fade out outgoing → set hidden → show incoming → fade in. Track current view to know what to fade out.
