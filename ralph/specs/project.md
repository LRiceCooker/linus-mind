# Project Specification — linus-mind

## Vision
A literary reading experience for Linus Torvalds' commit messages. Not a Git client, not a dashboard — a **book**. Each repository is a chapter. Each commit is a page. You read it on the couch, on the train, in bed. The writing is the star; the interface is invisible.

Think: The Paris Review meets Kindle meets a Penguin Classics paperback.

## Target user
A developer or tech enthusiast who knows that Linus writes commit messages like short essays — opinionated, detailed, sometimes angry, always brilliant. They want to **read** those messages, not skim diffs.

## User flow

```
[Cover page (full screen)]  →  scroll  →  [Repo list]  →  tap repo  →  [Chapter title]  →  scroll  →  [Commits...]
                                                          ←  back btn                      ←  back btn
```

The entire app is a scroll-snap book. The home page itself uses the same snap mechanic as the reader:
- **Snap point 0**: Full-viewport cover page (the "book cover")
- **After scroll**: The repository list (the "table of contents")

---

## Screen 1 — Repository Index (route: `#/`)

### Scroll container
The home page is a scroll-snap container, exactly like the commit reader:
- `height: 100dvh; overflow-y: auto`
- `scroll-snap-type: y mandatory`
- `overscroll-behavior-y: contain`
- `-webkit-overflow-scrolling: touch`

### Snap point 0: Cover page ("book cover")

The cover takes the **full viewport** — `100dvh`. This is the first thing you see. It's a book cover. Nothing else.

- `min-height: 100dvh; scroll-snap-align: start`
- Flex column, content centered both horizontally and vertically
- `text-align: center`
- Content:
  - **Title**: "linus-mind" — Source Serif 4 Light (300), `3.5rem` desktop / `2.5rem` mobile. Tight letter-spacing (`-0.04em`). This is the ONLY element on the full screen. It dominates.
  - **Tagline**: "reading the mind of linus torvalds, one commit at a time." — Inter 400, `0.875rem`, `--text-secondary`, all lowercase, `letter-spacing: 0.02em`. Gap: `--space-3` below title.
  - **Dinkus**: Three centered ornamental dots (`·  ·  ·`) in `--text-tertiary`. Gap: `--space-8` below tagline.
- At the bottom third: a subtle `↓` arrow with the same bounce animation as the reader's chapter title page. Fades out after 4s. `pointer-events: none`.
- The cover has NO border, NO background difference — just the title floating in warm emptiness.

### Snap point 1+: Repository list

After scrolling past the cover, the repo list appears. This section is a **single snap point** (not one per repo — that would be annoying for browsing). It's a regular scrollable area within its snap boundary.

- `min-height: 100dvh; scroll-snap-align: start`
- Content block: centered, max-width `42rem`, with horizontal padding per breakpoint
- Padding-top: `--space-16` (64px) — breathing room at the top of the list
- Each repo is an `<a>` tag spanning the full content width
- Repos separated by `1px` hairline divider in `--divider`
- First item has a top divider; last item has a bottom divider
- **No cards, no shadows, no colored backgrounds** — just text and dividers

### Repo item anatomy (top to bottom, inside the `<a>`)
1. **Repo name** — Source Serif 4, weight 600, `1.375rem` desktop / `1.1875rem` mobile, `--text`
2. **Description** — Source Serif 4 *italic*, weight 400, `0.9375rem`, `--text-secondary`. Max 2 lines, clamped with `-webkit-line-clamp: 2`. Gap: `--space-1` below name. Omit entirely if no description.
3. **Meta row** — Inter 400, `0.75rem`, `--text-tertiary`. Format: `Language · 1.2k ★`. Middle dot separator. No language color dots. Gap: `--space-2` below description.

### Repo item states
- **Default**: `background: transparent`
- **Hover** (desktop, `@media (hover: hover)` only): `background: var(--bg-hover)`. The hover background extends full-bleed (via negative margins + padding). Transition: `200ms ease`.
- **Active/pressed**: `background: var(--bg-active)`. Transition: `80ms ease`.
- **Focus-visible**: `outline: 2px solid var(--accent); outline-offset: 4px`

### Repo ordering
- Sorted by star count descending (most popular first)

### Loading state
- Centered spinner (`20px`, thin, `--accent` arc on `--divider` track)
- `48px` top margin from where the list starts
- No skeleton screens

### Error state
- Centered text, Inter 400, `0.9rem`, `--text-secondary`, `max-width: 28rem`
- Rate-limited (403): "GitHub needs a moment. Come back shortly."
- Other errors: "Something went wrong."
- No retry button
- `role="alert"` for screen readers

### Empty state
- "Nothing here yet." — same style as error

---

## Screen 2 — Commit Reader (route: `#/repo/{name}`)

### Overview
The reader is a vertical scroll container with snap points. The first snap point is a chapter title page. Subsequent snap points are individual commits. A fixed top bar provides navigation. A thin progress bar shows reading position.

### Reading progress bar
- `position: fixed; top: 0; left: 0; z-index: 200`
- `height: 2px`, `background: var(--accent)` at `50%` opacity
- Width: `(currentCommitIndex / totalCommits) * 100%`
- Transition: `width 300ms ease-out`
- Only visible in the reader, not the repo list

### Top bar (navigation)
- `position: fixed; top: 0; height: 48px; z-index: 100`
- Background: `var(--bg-elevated)` + `backdrop-filter: blur(16px)`
- Border-bottom: `1px solid var(--divider)`
- Contents: back button (`←` in serif, `44×44` tap target) + repo name (Inter 500, `0.8125rem`, `--text-secondary`, truncated)
- **Auto-hide on scroll**: visible by default. Hides (opacity 0, translateY -100%) after scrolling down > 80px. Reappears on scroll up. Transition: `300ms ease`. Throttle via `requestAnimationFrame`.
- On notched phones: add `env(safe-area-inset-top)` to padding-top

### Scroll container
- `height: 100dvh; overflow-y: auto`
- `scroll-snap-type: y mandatory`
- `-webkit-overflow-scrolling: touch`
- `overscroll-behavior-y: contain` (prevents iOS pull-to-refresh interference)

### Snap point 0: Chapter title page
The first snap point is NOT a commit. It's the title page of this "chapter".
- Full viewport height (`100dvh`), flex column, centered, `text-align: center`
- `scroll-snap-align: start`
- Content:
  - Repo name: Source Serif 4 Light (300), `2.5rem` desktop / `1.875rem` mobile
  - Description: Source Serif 4 italic, `1rem`, `--text-secondary`. `--space-3` gap below name.
  - Dinkus: `·  ·  ·` in `--text-tertiary`. `--space-8` gap below description.
  - "SCROLL TO BEGIN" prompt: Inter, `0.75rem`, `--text-tertiary`, `letter-spacing: 0.08em`, uppercase. At the bottom third of the page.
  - `↓` arrow below, bouncing gently (CSS animation, `1.8s ease-in-out infinite`)
  - The prompt + arrow fade out after 4 seconds via CSS animation

### Snap points 1–N: Commit pages

Each commit page is an `<article>`:
- `min-height: 100dvh; scroll-snap-align: start`
- Flex column, content at top, metadata pushed to bottom via `margin-top: auto`
- Reading column: `max-width: 38rem`, centered
- Padding: top `80px` desktop / `64px` mobile, bottom `48px` desktop / `32px` mobile, sides `var(--pad)`

Content anatomy:
1. **Title** — Source Serif 4 bold (700), `1.625rem` desktop / `1.3125rem` mobile. The first line of the commit message.
2. **Decorative rule** — `width: 3rem; height: 1px; background: var(--divider)`. Centered. `margin: 24px auto`. Only if commit has a body.
3. **Body** — Source Serif 4 regular (400), `1.125rem` desktop / `1.0625rem` mobile, `line-height: 1.9`. Processed through the typography parser (`js/typography.js` — see `ralph/specs/typography-parser.md` for full spec). The parser transforms raw text into typeset HTML: smart quotes, em dashes, inline `<code>` for technical terms/paths, `<blockquote>` for email quotes, `<ul>` for lists, de-emphasized git trailers, and proper paragraph breaks. The first 3-4 words are rendered in small-caps (`font-variant: small-caps`, weight 600, `letter-spacing: 0.05em`) as a lead-in — a classic editorial technique. The lead-in is applied after typesetting.
4. **Metadata** — pushed to bottom. Left: date ("15 March 2005", European format), Inter, `--text-secondary`. Right: SHA, JetBrains Mono, `--text-tertiary`.
5. **Counter** — centered below metadata, Inter, `--text-tertiary`. Format: `12 / 847` or `12 / 847+`.

### Commit entry animation
Each commit page starts at `opacity: 0; transform: translateY(12px)`. When it enters the viewport (IntersectionObserver, threshold 0.3), it transitions to `opacity: 1; transform: translateY(0)` over `400ms ease-out`. This creates a subtle "page reveal" effect.

### Commit ordering
- **Chronological: oldest first.** The story starts at the beginning.
- GitHub API returns newest first → reverse.
- Sort all loaded commits by date ascending after each batch load.

### Infinite scroll
- Trigger: when the user reaches the second-to-last commit page
- Show spinner at bottom during loading
- Append new commits (sorted into chronological order)
- **Critical**: scroll position must NOT jump when new commits are inserted
- When all commits are loaded: no indicator, just a clean ending

### Keyboard navigation (desktop)
- `↓` / `Space` / `PageDown`: next commit
- `↑` / `PageUp`: previous commit
- `Escape` / `Backspace`: back to repo list
- Only active when the reader view is visible

### Reading progress persistence

The reader must remember where the user left off in each repo — even after closing the browser and coming back days later.

#### Storage
- `localStorage` key: `linus-mind:progress`
- Value: JSON object mapping repo names to progress state:
```json
{
  "linux": { "commitIndex": 42, "page": 3, "totalLoaded": 90, "updatedAt": 1714150000000 },
  "subsurface-for-dirk": { "commitIndex": 7, "page": 1, "totalLoaded": 30, "updatedAt": 1714140000000 }
}
```
- `commitIndex`: the 0-based index of the commit the user was reading (in chronological order)
- `page`: the last API page that was fetched (so we know how many pages of data to reload)
- `totalLoaded`: total commits loaded so far
- `updatedAt`: timestamp of last update (for potential cleanup of very old entries)

#### Saving progress
- On every scroll snap (when a new commit page becomes the active/visible one via IntersectionObserver), update the stored progress for the current repo.
- Debounce writes to `localStorage` — at most once per second (scroll events can fire fast).
- Also save on `beforeunload` event as a last-resort save.

#### Restoring progress
- When entering a repo (`#/repo/{name}`), check `localStorage` for saved progress.
- If progress exists:
  1. Fetch commits up to the saved `page` (fetch page 1, 2, ... N sequentially or in parallel). This reloads the data needed to reach the saved position.
  2. Render the chapter title page + all loaded commits as normal.
  3. After rendering, scroll to the saved `commitIndex` position (programmatically, using `scrollTo` on the snap container targeting the correct commit page element). Use `behavior: 'instant'` — no animation, just jump to the right page.
  4. The user picks up exactly where they left off.
- If no progress exists: start from the chapter title page as usual.

#### UX indicator on repo list
- On the repo list, repos where the user has saved progress show a subtle reading indicator:
  - A small text below the meta row: "page 42" — Inter, `0.6875rem`, `--text-tertiary`, `font-style: italic`
  - This tells the user "you were here" without being intrusive
  - Repos with no saved progress show nothing extra

#### Cleanup
- Entries older than 30 days (`updatedAt` check) are removed on app load to prevent unbounded growth.
- Max 20 entries stored. If adding a new one exceeds 20, remove the oldest by `updatedAt`.

### Empty state
- If repo has 0 commits: "No commits to read." centered, same style as error.
- Back button still works.

---

## Technical architecture

### File structure
```
index.html
css/
  style.css
js/
  app.js          # Routing, view orchestration, events
  github.js       # API calls + caching
  ui.js           # DOM rendering functions
tests/
  e2e/
    playwright.config.js
    fixtures/
      repos.json
      commits.json
    repos.spec.js
    reader.spec.js
    navigation.spec.js
    responsive.spec.js
```

### Routing
- Hash-based: `#/` = repo list, `#/repo/{name}` = reader
- `hashchange` listener → show/hide views, trigger data loading
- On initial page load → read hash and route
- **View transitions**: outgoing view fades out (`opacity 0` over `250ms`), then `display: none`. Incoming view is `display: block`, fades in.

### GitHub API
- Base: `https://api.github.com`
- Repos: `GET /users/torvalds/repos?type=owner&sort=stars&direction=desc&per_page=100`
- Commits: `GET /repos/torvalds/{repo}/commits?per_page=30&page={n}`
- No auth — public endpoints, 60 req/hour
- Pagination: parse `Link` header for `rel="next"`
- Error handling: `res.ok` check, 403 = rate limit, 404 = not found

### Caching

The caching layer is **critical** — at 60 req/hour unauthenticated, every avoidable request matters. Three mechanisms work together: data cache, conditional requests, and rate-limit awareness.

#### Data cache (what we store)
- **Repos**: `sessionStorage` under key `linus-mind:repos`. Value is a JSON object `{ data: [...], etag: "...", timestamp: <ms> }`.
- **Commits**: in-memory `Map` keyed by `${repo}:${page}`. Value is `{ data: { commits, hasMore }, etag: "..." }`. Lost on page refresh — that's fine.
- **Reading progress**: `localStorage` under key `linus-mind:progress`. Value is a JSON object `{ [repoName]: { commitIndex, page, timestamp } }`. Persists across sessions — this is how the reader resumes.
- On back navigation: repo list renders from cache, no API call.

#### TTL & staleness
- Repos cache has a **10-minute TTL**. On read, check `Date.now() - timestamp > 600_000`. If stale, make a **conditional request** (see below) rather than a full fetch. If the conditional request returns 304, refresh the timestamp and keep the cached data.
- Commits have **no TTL** (commit history doesn't change fast enough to matter during a session). They stay cached for the lifetime of the page.

#### Conditional requests (ETags)
Every GitHub API response includes an `ETag` header. A request that sends `If-None-Match: <etag>` and receives a `304 Not Modified` response **does not count** against the rate limit. This is the single most important optimization.

**Implementation in `js/github.js`:**
- On every successful API response (`200`), store the `ETag` header value alongside the cached data.
- When making a request for data that already has a cached ETag, add the header `If-None-Match: <stored_etag>` to the `fetch()` call.
- On `304` response: return the cached data as-is (do NOT parse the body — there isn't one). Update the timestamp if applicable (repos).
- On `200` response: parse the new data, update cache + ETag.
- On error (403, 5xx, network): fall through to existing error handling.

```javascript
// Example pattern (repos)
const headers = {};
if (cached?.etag) headers['If-None-Match'] = cached.etag;

const res = await fetch(url, { headers });

if (res.status === 304) {
  // Free request — update timestamp, return cached data
  cached.timestamp = Date.now();
  sessionStorage.setItem(KEY, JSON.stringify(cached));
  return cached.data;
}
if (!res.ok) throw { status: res.status };

const etag = res.headers.get('ETag');
const data = await res.json();
// ... process and cache with etag ...
```

#### Rate-limit monitoring
Every GitHub API response includes three headers:
- `X-RateLimit-Limit`: max requests (60)
- `X-RateLimit-Remaining`: requests left
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

**Implementation:**
- `js/github.js` exports a `getRateLimitInfo()` function that returns the latest `{ remaining, resetAt }` from the most recent API response. This is stored in a module-level variable, updated on every non-304 response.
- When `remaining <= 5`: `js/app.js` shows a subtle, non-intrusive warning bar below the progress bar. Text: "GitHub API limit nearly reached — cached content still available." Style: Inter 400, `0.75rem`, `--text-tertiary`, centered, `padding: 8px`, `background: var(--bg-hover)`. The bar appears with a `300ms ease` fade-in.
- When `remaining === 0`: all API calls skip the fetch and return cached data if available. If no cached data, show the existing 403 error message. The warning bar updates to: "GitHub API limit reached — resets at {time}." where `{time}` is formatted as `HH:MM` from the reset timestamp.
- The warning bar is an element `#rate-limit-bar` in `index.html`, hidden by default (`display: none`).

#### Cache architecture summary
```
Request flow:
  1. Check in-memory / sessionStorage cache
  2. If cached + fresh (within TTL) → return cached data, no fetch
  3. If cached + stale (past TTL) or cached with ETag → conditional fetch (If-None-Match)
  4. If 304 → return cached data (free, doesn't count against rate limit)
  5. If 200 → update cache + ETag + timestamp, return new data
  6. If remaining <= 5 → show warning
  7. If remaining === 0 → skip fetch, use cache or show error
  8. If 403/5xx → show error, keep cached content accessible
```

### Performance
- Zero dependencies, zero build step
- Preconnect to `api.github.com` and `fonts.googleapis.com`
- Google Fonts loaded with `display=swap`
- Lazy DOM rendering: render ~10 commit pages at a time, add more on scroll approach
- Never render 500 pages at once

---

## E2E Testing — Playwright

### Setup
- Config at `tests/e2e/playwright.config.js`
- `webServer`: starts a local static server (e.g., `npx serve . -l 3000`)
- Chromium only (no cross-browser for MVP)
- Mock GitHub API via `page.route()` in every test
- Fixtures: `tests/e2e/fixtures/repos.json` (4 repos), `tests/e2e/fixtures/commits.json` (10 commits)

### Test suites

#### `repos.spec.js`
- Title "linus-mind" is visible
- Repo list loads from mock API and renders repos
- Each repo shows a name element
- Repos are `<a>` tags (semantic)
- Spinner appears while loading (mock slow response with 1s delay)
- Error message on 403 response
- Dinkus ornament is visible

#### `reader.spec.js`
- Navigate to `#/repo/linux` → reader view visible
- Chapter title page shows repo name
- "SCROLL TO BEGIN" text is visible initially
- Commit pages render with titles and dates
- Scroll snap is active (`scroll-snap-type` computed style on container)
- Decorative rule visible between title and body
- Reading progress bar exists and has accent color
- Small-caps lead-in on first commit body

#### `navigation.spec.js`
- Back button returns to repo list
- Direct URL `#/repo/linux` loads reader on fresh page load
- Browser back button works (history)
- Escape key goes back to repo list
- Repo list is NOT re-fetched on back (mock should only be called once)

#### `responsive.spec.js`
- iPhone 13 viewport: content fills width, font-size ≥ 14px, tap targets ≥ 44px
- Desktop 1440px: content centered at max-width, hover effects work
- Dark mode (`colorScheme: 'dark'`): background matches dark `--bg`, text matches dark `--text`
- `prefers-reduced-motion`: no transitions active (animation-duration near zero)
