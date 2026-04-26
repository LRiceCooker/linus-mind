# Project Specification — linus-mind

## Vision
A literary reading experience for Linus Torvalds' commit messages. Not a Git client, not a dashboard — a **book**. Each repository is a chapter. Each commit is a page. You read it on the couch, on the train, in bed. The writing is the star; the interface is invisible.

Think: The Paris Review meets Kindle meets a Penguin Classics paperback.

## Target user
A developer or tech enthusiast who knows that Linus writes commit messages like short essays — opinionated, detailed, sometimes angry, always brilliant. They want to **read** those messages, not skim diffs.

## User flow

```
[Landing / Repo list]  →  tap repo  →  [Chapter title page]  →  scroll  →  [Commit pages...]
                        ←  back btn                           ←  back btn
```

Three "screens", but really two views: the index and the reader. The chapter title page is just the first snap point of the reader.

---

## Screen 1 — Repository Index (route: `#/`)

This is the **table of contents** of the book. Calm, spacious, inviting.

### Layout
- Full-width warm parchment background (`--bg`), no visible container
- Content block: centered, max-width `42rem`, with horizontal padding per breakpoint
- Vertical rhythm: everything breathes

### Hero area ("book cover")
- **Title**: "linus-mind" — Source Serif 4 Light (300), `3rem` desktop / `2.25rem` mobile. Centered. Tight letter-spacing (`-0.04em`). This should feel like a book title on a cover.
- **Tagline**: "reading the mind of linus torvalds, one commit at a time." — Inter 400, `0.875rem`, `--text-secondary`, all lowercase, `letter-spacing: 0.02em`. Gap: `--space-3` below title.
- **Dinkus**: Three centered ornamental dots (`·  ·  ·`) in `--text-tertiary`. Gap: `--space-6` below tagline. This is the classic editorial section break.
- Min-height: `25vh` desktop, `15vh` mobile. Flex centered.
- No borders, no backgrounds — just text and void.

### Repository list
- Appears below the hero with `--space-4` gap
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
3. **Body** — Source Serif 4 regular (400), `1.125rem` desktop / `1.0625rem` mobile, `line-height: 1.9`. `white-space: pre-wrap`. The first 3-4 words are rendered in small-caps (`font-variant: small-caps`, weight 600, `letter-spacing: 0.05em`) as a lead-in — a classic editorial technique.
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
- Repos: sessionStorage (survives same-tab navigation, cleared on tab close)
- Commits: in-memory Map per repo per page (lost on refresh — that's fine)
- On back navigation: repo list renders from cache, no API call

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
