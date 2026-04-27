# Design System — linus-mind

> Design reference: The Paris Review online, Instapaper reader, a well-typeset Penguin Classics paperback.
> This is a literary object. Every choice must serve the reading experience.

---

## 1. Design principles

1. **The text is the interface.** There are no buttons to admire, no layouts to appreciate. There is only Linus' writing, set in beautiful type on a calm background. If you notice the design, it has failed.
2. **Warmth over sterility.** Warm tones, serif type, generous spacing. This should feel like holding a book, not like opening an app. No cold blues, no sharp grays, no clinical whites.
3. **Intentional emptiness.** White space is not "unused space" — it is the most important design element. It gives the text room to breathe and the eye room to rest. When in doubt, add more emptiness.
4. **Typographic hierarchy only.** We establish hierarchy through font size, weight, and color — never through boxes, cards, badges, or colored backgrounds. The page is flat. Always.
5. **Invisible motion.** Transitions exist to prevent jarring changes, never to draw attention. If a user notices an animation, it's too much.

---

## 2. Visual identity

### Mood
Imagine: it's 11pm, you're in bed, reading on your phone in the dark. Or it's Sunday morning, you have coffee, you're on the couch with your laptop. This app should feel perfect in both moments. Quiet. Intimate. Thoughtful.

### References
- **The Paris Review** (parisreview.org): clean editorial typography, vast white space, serif-driven hierarchy
- **Instapaper**: the original "read it later" app — warm paper tones, zero chrome
- **Penguin Classics covers**: bold serif title, minimal elements, timeless
- **Kindle Paperwhite**: sepia mode, page-turn feel, nothing but text
- **iA Writer**: radical simplicity, one font, one color, just write (or in our case, just read)

### Logo / title treatment
"linus-mind" is not a logo — it's a **title**, set in the reading font. No custom wordmark, no icon, no symbol. Just the words. This is a book, and books have titles, not logos.

---

## 3. Color system

Colors are warm-shifted in every mode. Nothing clinical, nothing cold.

### Light mode (default)
```css
--bg:             #f8f6f1;   /* Warm parchment — like Moleskine paper */
--bg-elevated:    #f3f0ea;   /* Slightly darker for subtle layering (top bar) */
--bg-hover:       #efece5;   /* Visible but gentle hover state */
--bg-active:      #e8e4dc;   /* Clear pressed state */
--text:           #2c2c2c;   /* Warm near-black — softer than #1a1a1a */
--text-secondary: #8a8580;   /* Warm medium gray — metadata, dates */
--text-tertiary:  #b5b0a8;   /* Very subtle — page counters, SHA hashes */
--accent:         #b8976a;   /* Muted warm gold — used VERY sparingly */
--divider:        #e4e0d8;   /* Warm hairline — visible but not distracting */
--selection:      rgba(184, 151, 106, 0.2);  /* Warm gold tint for text selection */
```

### Dark mode (`prefers-color-scheme: dark`)
```css
--bg:             #1a1916;   /* Deep warm charcoal — like a leather-bound book */
--bg-elevated:    #222019;   /* Slightly lighter for top bar */
--bg-hover:       #2a2720;   /* Subtle hover lift */
--bg-active:      #333028;   /* Clear pressed state */
--text:           #d9d4ca;   /* Warm cream — like candlelight on paper */
--text-secondary: #7d786f;   /* Muted warm gray */
--text-tertiary:  #4a4740;   /* Very subtle */
--accent:         #c9a96e;   /* Slightly brighter gold in dark — needs more pop */
--divider:        #2e2b25;   /* Nearly invisible */
--selection:      rgba(201, 169, 110, 0.25);
```

### Color rules
- **Never pure black (`#000`) or pure white (`#fff`)**. Ever. Not even for borders.
- The accent gold is used ONLY for: the spinner arc, focus-visible outlines, text selection, and the thin reading progress bar. That's it. No gold text, no gold icons, no gold backgrounds.
- Text contrast must be at least **7:1** against background (WCAG AAA).
- `<meta name="theme-color">` must match `--bg` per color scheme. Implement with `<meta name="theme-color" content="#f8f6f1" media="(prefers-color-scheme: light)">` and `<meta name="theme-color" content="#1a1916" media="(prefers-color-scheme: dark)">`.

---

## 4. Typography

This is the single most important section of this document. Typography makes or breaks a reading experience.

### Font stacks

| Role        | Stack | Why |
|-------------|-------|-----|
| **Reading** | `'Source Serif 4', Georgia, 'Noto Serif', serif` | Source Serif 4 is an optical-size serif designed for screens. Beautiful at both text and display sizes. Variable weight and optical size. |
| **UI**      | `'Inter', system-ui, -apple-system, sans-serif` | Inter is the gold standard for UI text. Clean, neutral, excellent at small sizes. |
| **Mono**    | `'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace` | For SHA hashes only. JetBrains Mono has distinct character shapes. |

### Web fonts to load
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap" rel="stylesheet">
```

Load Source Serif 4 in weights 300 (light — for large titles), 400 (regular — for body), 600 (semibold — for repo names), 700 (bold — for commit titles). Load italic 400 for repo descriptions.
Load Inter in 400 (regular) and 500 (medium).

### Type scale — complete specification

#### Screen 1: Repository Index

| Element | Font | Desktop | Mobile (≤639px) | Weight | Line-height | Letter-spacing | Color |
|---------|------|---------|-----------------|--------|-------------|----------------|-------|
| **Book title "linus-mind"** | Source Serif 4 | `3.5rem` / `56px` | `2.5rem` / `40px` | 300 (light) | 1.1 | `-0.04em` | `--text` |
| **Tagline** | Inter | `0.875rem` / `14px` | `0.8125rem` / `13px` | 400 | 1.6 | `0.02em` | `--text-secondary` |
| **Repo name** | Source Serif 4 | `1.375rem` / `22px` | `1.1875rem` / `19px` | 600 | 1.3 | `-0.01em` | `--text` |
| **Repo description** | Source Serif 4 *italic* | `0.9375rem` / `15px` | `0.875rem` / `14px` | 400 | 1.55 | normal | `--text-secondary` |
| **Repo meta (language, stars)** | Inter | `0.75rem` / `12px` | `0.6875rem` / `11px` | 400 | 1.4 | `0.01em` | `--text-tertiary` |

> **Note on repo descriptions**: Set in *serif italic*. This is a deliberate editorial choice — it differentiates the description from the name while staying in the serif family. Italic serif at small sizes reads as "annotation" or "subtitle", which is exactly what a repo description is.

#### Screen 2: Commit Reader

| Element | Font | Desktop | Mobile (≤639px) | Weight | Line-height | Letter-spacing | Color |
|---------|------|---------|-----------------|--------|-------------|----------------|-------|
| **Commit title** | Source Serif 4 | `1.625rem` / `26px` | `1.3125rem` / `21px` | 700 | 1.35 | `-0.015em` | `--text` |
| **Commit body** | Source Serif 4 | `1.125rem` / `18px` | `1.0625rem` / `17px` | 400 | 1.9 | `0.003em` | `--text` |
| **Commit date** | Inter | `0.8125rem` / `13px` | `0.75rem` / `12px` | 400 | 1 | `0.01em` | `--text-secondary` |
| **Commit SHA** | JetBrains Mono | `0.6875rem` / `11px` | `0.625rem` / `10px` | 400 | 1 | `0.05em` | `--text-tertiary` |
| **Page counter** | Inter | `0.6875rem` / `11px` | `0.625rem` / `10px` | 400 | 1 | `0.04em` | `--text-tertiary` |
| **Top bar repo name** | Inter | `0.8125rem` / `13px` | `0.75rem` / `12px` | 500 | 1 | normal | `--text-secondary` |
| **Chapter title page: repo name** | Source Serif 4 | `2.5rem` / `40px` | `1.875rem` / `30px` | 300 (light) | 1.15 | `-0.03em` | `--text` |
| **Chapter title page: description** | Source Serif 4 *italic* | `1rem` / `16px` | `0.9375rem` / `15px` | 400 | 1.6 | normal | `--text-secondary` |
| **Chapter title page: "begin" prompt** | Inter | `0.75rem` / `12px` | `0.6875rem` / `11px` | 400 | 1 | `0.08em` | `--text-tertiary` |

### Line-height philosophy
- **1.9 for commit body text** — this is aggressively generous. It gives each line room to sit. It's the difference between "reading a webpage" and "reading a book". Most websites use 1.5-1.6, but 1.9 with a good serif at 18px is where reading becomes comfortable for long periods.
- **1.35 for commit titles** — tighter, because titles are short and need visual punch.
- **1.1 for the book title** — display type should be tight.

### Max reading width
- **`38rem`** (608px) for the commit body. This gives roughly 65-75 characters per line, which is the sweet spot for sustained reading. Not `40rem` — narrower is more comfortable for body text.
- **`42rem`** for the overall content container (repo list, page structure). This gives slightly more room for layout elements while keeping the reading column narrow.

---

## 5. Spacing system

Base unit: `4px`. All spacing is a multiple of 4.

```css
--space-1:  0.25rem;   /*  4px  */
--space-2:  0.5rem;    /*  8px  */
--space-3:  0.75rem;   /* 12px  */
--space-4:  1rem;      /* 16px  */
--space-5:  1.25rem;   /* 20px  */
--space-6:  1.5rem;    /* 24px  */
--space-8:  2rem;      /* 32px  */
--space-10: 2.5rem;    /* 40px  */
--space-12: 3rem;      /* 48px  */
--space-16: 4rem;      /* 64px  */
--space-20: 5rem;      /* 80px  */
--space-24: 6rem;      /* 96px  */
```

### Page padding (horizontal)
| Viewport | Value | Rationale |
|----------|-------|-----------|
| < 640px  | `24px` | Enough to not feel cramped on small screens |
| 640–1024px | `40px` | Comfortable breathing room |
| > 1024px | Content is centered at max-width, padding is irrelevant (auto margins handle it) |

---

## 6. Component specifications

### 6.1 — Cover page (full-screen book cover)

The cover takes the **entire viewport**. It's the first thing you see. Like opening a book to the title page. Nothing but the title, the void, and a gentle invitation to scroll.

```
┌──────────────────────────── viewport ─────────────────────────────────┐
│                                                                        │
│                                                                        │
│                                                                        │
│                                                                        │
│                                                                        │
│                          linus-mind                                    │ ← Source Serif 4 Light, 3.5rem
│                                                                        │
│              reading the mind of linus torvalds,                       │ ← Inter, 0.875rem, secondary
│                one commit at a time.                                   │
│                                                                        │
│                        ·  ·  ·                                         │ ← dinkus, tertiary
│                                                                        │
│                                                                        │
│                                                                        │
│                                                                        │
│                                                                        │
│                                                                        │
│                          ↓                                             │ ← bounce, fades after 4s
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

═══════════ SCROLL SNAP ═══════════

┌──────────────────────────── viewport ─────────────────────────────────┐
│                                                                        │
│         ┌───────── repo list (max 42rem) ──────────┐                  │
│         │                                           │                  │
│         │─────────────────────────────────────────  │                  │
│         │ linux                                     │                  │
│         │ Development kernel source tree             │                  │
│         │ C · 456k ★                                │                  │
│         │─────────────────────────────────────────  │                  │
│         │ subsurface-for-dirk                       │                  │
│         │ ...                                       │                  │
│         └───────────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────────────────┘
```

- The **home page is a scroll-snap container** (same mechanic as the reader):
  - `height: 100dvh; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior-y: contain`
- Cover page: `min-height: 100dvh; scroll-snap-align: start`
- `display: flex; flex-direction: column; align-items: center; justify-content: center`
- Title: Source Serif 4 **Light** (300), `3.5rem` desktop / `2.5rem` mobile, `letter-spacing: -0.04em`, `--text`. The title dominates — it's the only significant element on a full screen.
- Tagline: Inter 400, `0.875rem`, `--text-secondary`, lowercase, `letter-spacing: 0.02em`. Gap: `--space-3` below title.
- Dinkus: `·  ·  ·` in `--text-tertiary`, `font-size: 0.75rem`. Gap: `--space-8` below tagline.
- Scroll arrow: `↓`, same bounce animation as the chapter title page (`1.8s ease-in-out infinite`). Positioned at the bottom third of the page. Fades out after 4s. `pointer-events: none; --text-tertiary`.
- No borders, no backgrounds, no decorations — just the title floating in warm void.

**Repo list section**: starts at the second snap point.
- `min-height: 100dvh; scroll-snap-align: start`
- Padding-top: `--space-16` (64px) for breathing room.
- Contains the repo list (specs unchanged from §6.2).

### 6.2 — Repo card

```
│                                                           │
│  subsurface-for-dirk                                      │ ← serif, 600, 1.375rem
│  Subsurface dive log program                              │ ← serif italic, 400, secondary
│  C · 234 ★                                                │ ← Inter, tertiary, with mid-dot sep
│                                                           │
│───────────────────────────────────────────────────────────│ ← 1px, --divider
```

- Element: `<a>` wrapping the entire card
- Padding: `--space-6` top and bottom (`24px`)
- Divider: only bottom border. First card gets a top border too.
- **Repo name**: Source Serif 4, weight 600 (semibold). Not bold — semibold is more refined.
- **Description**: Source Serif 4 **italic**, weight 400, `--text-secondary`. This is the key editorial choice — italic serif reads as a subtitle or annotation. Max 2 lines with `-webkit-line-clamp: 2`. If no description, omit entirely (no empty gap).
- **Meta line**: Inter 400, `--text-tertiary`. Format: `Language · 1.2k ★` — using a middle dot `·` (`&middot;`) as separator, not a bullet, not a pipe. The middle dot is the classiest separator. No language color dot — that's a GitHub UI pattern, not a literary one. Just the language name.
- Gaps: name → description: `--space-1` (4px). Description → meta: `--space-2` (8px).
- **Hover** (desktop only, via `@media (hover: hover)`): `background: var(--bg-hover)`. Add `margin: 0 calc(var(--pad) * -1); padding-left: var(--pad); padding-right: var(--pad);` so the hover background extends to the full viewport width while the text stays aligned. Transition: `background 200ms ease`.
- **Active/pressed**: `background: var(--bg-active)`. Transition: `background 80ms ease`.
- **Focus-visible**: `outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 2px`.
- **No language color dots.** This is a book, not GitHub. We list the language as plain text.

### 6.3 — Chapter title page (commit reader entry)

**This is a new concept.** When you open a repo, the first "page" (first snap point) is not a commit — it's a **chapter title page**, like the title page at the start of a book chapter.

```
┌──────────────────────── viewport ──────────────────────┐
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                        linux                            │ ← Source Serif 4 Light, 2.5rem
│                                                         │
│          Development kernel source tree                  │ ← serif italic, 1rem, secondary
│                                                         │
│                                                         │
│                       ·  ·  ·                           │ ← ornamental dots
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                   SCROLL TO BEGIN                        │ ← Inter, 0.75rem, tertiary
│                      uppercase                          │   letter-spacing: 0.08em
│                          ↓                              │   + gentle bounce on arrow
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Full viewport height (`100dvh`), flex column, `justify-content: center`, `text-align: center`
- `scroll-snap-align: start` (it's the first snap point)
- Repo name: Source Serif 4 **Light** (300), `2.5rem` desktop / `1.875rem` mobile
- Description: Source Serif 4 italic, `1rem`, `--text-secondary`, `--space-3` gap below name
- Ornamental dots: same as hero (`·  ·  ·`), `--text-tertiary`, `--space-8` gap below description
- "SCROLL TO BEGIN" prompt: at the bottom third of the page, Inter, `0.75rem`, `--text-tertiary`, `letter-spacing: 0.08em`, uppercase
- Gentle `↓` below it with bounce animation
- This prompt fades out after 4 seconds (same as the old scroll hint — rolled into this)
- **This page sets the tone.** It tells the reader: you are about to read the story of this project. Take a breath.

### 6.4 — Commit page

The most important component. Must be perfect.

```
┌──────────────────────── viewport ──────────────────────┐
│                                                         │
│  [top bar — visible or hidden]                          │
│                                                         │
│        ┌──── reading column (max 38rem) ────┐          │
│        │                                     │          │
│        │  Commit title — serif bold           │  ← 80px from top (desktop)
│        │                                     │     64px from top (mobile)
│        │  ─── thin rule ───                  │  ← centered, 3rem wide
│        │                                     │     --divider color, 1px
│        │  The commit body text flows here    │  ← 18px serif, line-height 1.9
│        │  with beautiful generous spacing    │
│        │  between lines. Linus' formatting   │
│        │  is preserved exactly as he wrote   │
│        │  it, with line breaks and           │
│        │  indentation intact.                │
│        │                                     │
│        │  He often writes paragraphs like    │
│        │  this — thoughtful, precise,        │
│        │  sometimes furious...               │
│        │                                     │
│        │           (flex grow)               │
│        │                                     │
│        │  March 15, 2005                     │  ← margin-top: auto
│        │                           a1b2c3d   │  ← same line, right-aligned
│        │                                     │
│        │            12 / 847                 │  ← centered, very faint
│        └─────────────────────────────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Full viewport height**: `min-height: 100dvh`. `scroll-snap-align: start`.
- **Flex column**: content at top, metadata pushed to bottom via `margin-top: auto`.
- **Reading column**: `max-width: 38rem`, centered via `margin: 0 auto`.
- **Padding**: top `80px` desktop / `64px` mobile (clears nav). Bottom `48px` desktop / `32px` mobile. Sides `var(--pad)`.

#### Commit title
- Source Serif 4 bold (700), `1.625rem` / `26px` desktop, `1.3125rem` / `21px` mobile.
- `line-height: 1.35`. `letter-spacing: -0.015em`.
- Color: `--text`.

#### Decorative rule between title and body
- A thin centered horizontal rule: `width: 3rem`, `height: 1px`, `background: var(--divider)`.
- Centered with `margin: --space-6 auto` (24px above and below).
- This is a classic typographic separator used in books and literary magazines to divide the title from the text. It adds structure without weight.
- **Only shown if the commit has a body.** If it's a title-only commit, no rule.

#### Commit body
- Source Serif 4 regular (400), `1.125rem` / `18px` desktop, `1.0625rem` / `17px` mobile.
- `line-height: 1.9`. This is the hero spec. 1.9 at 18px with Source Serif 4 is beautiful.
- `letter-spacing: 0.003em` — barely perceptible, opens up the text just a fraction.
- `white-space: pre-wrap` — **CRITICAL**. Linus' formatting must be preserved exactly.
- `word-break: break-word` — prevent horizontal overflow.
- `overflow-wrap: break-word` — belt and suspenders.
- Color: `--text`.
- If body is empty → element is not rendered. No rule either.

#### First line treatment
- The very first line of the commit body (first text line after the decorative rule) should have a **run-in small-caps lead-in**. Take the first 3-4 words, render them in `font-variant: small-caps`, `font-weight: 600`, `letter-spacing: 0.05em`. This is a classic editorial technique (used by The New Yorker, The Paris Review, etc.) that signals "the text begins here".
- Implementation: wrap the first few words in a `<span class="lead-in">` when rendering.
- How to split: take text up to and including the first comma, period, colon, or dash — or the first 4 words, whichever comes first.
- **Only for the first commit body line, not for every paragraph.**

#### Metadata footer
- `margin-top: auto` — always at the bottom.
- `padding-top: --space-10` (40px) — generous gap from body text.
- Two-row layout:
  - **Row 1**: Flex, `justify-content: space-between`. Left: date. Right: SHA.
  - **Row 2**: Page counter, centered.
- **Date format**: "15 March 2005" (European style — day before month. More literary, less American-corporate).
- Date styling: Inter 400, `0.8125rem`, `--text-secondary`.
- SHA styling: JetBrains Mono 400, `0.6875rem`, `--text-tertiary`. `letter-spacing: 0.05em`.
- Page counter: Inter 400, `0.6875rem`, `--text-tertiary`. `margin-top: --space-2`. Format: `12 / 847` or `12 / 847+` if more commits exist. The `/` should have `0.25em` padding on each side.

### 6.5 — Top bar

Absolutely minimal. Should feel like it's barely there.

- Height: `48px`.
- `position: fixed; top: 0; left: 0; right: 0; z-index: 100`.
- Background: `var(--bg-elevated)` with `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)`.
- Border-bottom: `1px solid var(--divider)`.
- Padding: `0 var(--pad)`.
- Layout: flex, `align-items: center`, `gap: --space-3` (12px).

#### Back button
- `44px × 44px` tap target (critical for mobile accessibility).
- Visual: `←` character, Source Serif 4 (not Inter — it looks better in serif), `1.25rem`.
- `background: transparent; border: none; border-radius: 6px; cursor: pointer`.
- States: hover `var(--bg-hover)`, active `var(--bg-active)`, focus-visible `outline: 2px solid var(--accent); outline-offset: 2px`.
- Transition: `background 150ms ease`.

#### Repo name
- Inter 500, `0.8125rem`, `--text-secondary`.
- `text-overflow: ellipsis; overflow: hidden; white-space: nowrap`.

#### Auto-hide behavior
- **Visible** by default: `opacity: 1; transform: translateY(0)`.
- **Hidden** after scrolling down > 80px: `opacity: 0; transform: translateY(-100%); pointer-events: none`.
- **Revealed** when scrolling up (any amount): back to visible.
- Transition: `opacity 300ms ease, transform 300ms ease`.
- Implementation: track `lastScrollTop` in a scroll listener throttled via `requestAnimationFrame`. Compare current vs last: if delta > 0 and scrollTop > 80 → hide. If delta < 0 → show.

### 6.6 — Reading progress bar

A razor-thin progress indicator at the very top of the viewport.

- `position: fixed; top: 0; left: 0; height: 2px; z-index: 200`.
- Background: `var(--accent)` at `50%` opacity. No background track — just the filled portion.
- Width: `(currentCommitIndex / totalCommits) * 100%`.
- Transition: `width 300ms ease`.
- It sits ABOVE the top bar when visible, and above the content when the top bar is hidden.
- This is the only accent-colored element on screen. It gives a sense of progress without being intrusive.
- **Only visible in the commit reader view**, not on the repo list.

### 6.7 — Loading spinner

- Size: `20px × 20px` (smaller than typical — we're refined here).
- Border: `1.5px solid var(--divider)`.
- Border-top: `1.5px solid var(--accent)`.
- Border-radius: `50%`.
- Animation: `rotate 0.8s linear infinite`.
- Centered in its container.
- Wrapping container has `padding: --space-12 0` (48px) in repo list, `padding: --space-8 0` (32px) at bottom of commit scroll.

### 6.8 — Error / empty states

- Centered text, Inter 400, `0.9rem`, `--text-secondary`.
- `max-width: 28rem`, centered.
- Slightly literary tone:
  - Rate limit: "GitHub needs a moment. Come back shortly."
  - Network error: "Something went wrong."
  - No repos: "Nothing here yet."
  - No commits: "No commits to read."
- No icons, no emojis, no retry buttons. Just the words.
- `role="alert"` for accessibility.

---

## 7. Responsive design

### Breakpoints
```css
/* Mobile first — base styles are for mobile */
/* Tablet */  @media (min-width: 640px)  { ... }
/* Desktop */ @media (min-width: 1024px) { ... }
```

### Mobile (< 640px)
- Content: full bleed with `24px` horizontal padding
- Hero: compact (`15vh` min-height), title `2.25rem`, tagline `0.8125rem`
- Repo cards: full width, generous padding
- Commit pages: `64px` top padding, body text `17px`, title `21px`
- Top bar: always accessible (auto-hide still works but threshold is `50px` instead of `80px`)
- Tap targets: minimum `44px × 44px` everywhere
- `100dvh` for all full-height elements (handles mobile browser chrome)
- `env(safe-area-inset-bottom)` padding on the bottom of commit pages for home-indicator phones
- `env(safe-area-inset-top)` added to top bar padding for notched phones
- **No hover states** — use `@media (hover: hover)` to gate hover effects
- **Font sizes floor**: nothing below `10px` rendered (check all tertiary text)

### Tablet (640–1024px)
- Content: centered, `max-width: 42rem`, `40px` padding
- Hero: medium height
- All type sizes: desktop scale
- Hover states: active (usually has a pointer)

### Desktop (> 1024px)
- Content: centered, `max-width: 42rem`, auto margins
- Hero: full height (`25vh`)
- All type sizes: desktop scale
- Hover states: active
- Keyboard navigation: fully functional
- Hover on repo cards with the full-bleed background effect

### Ultra-wide (> 1440px)
- No changes — content stays at `42rem`. The whitespace on the sides IS the design.

---

## 8. Transitions and animations

| Element | Property | Duration | Easing | Trigger |
|---------|----------|----------|--------|---------|
| View switch | opacity | 250ms | ease | Route change |
| Repo card hover | background | 200ms | ease | `@media (hover: hover)` |
| Repo card active | background | 80ms | ease | Pointer down / touch |
| Top bar show/hide | opacity, transform | 300ms | ease | Scroll direction |
| Reading progress bar | width | 300ms | ease-out | Scroll / snap |
| Scroll hint fade | opacity | 1200ms | ease-out | After 4s delay |
| Scroll hint bounce | transform | 1800ms | ease-in-out | Infinite |
| Spinner | transform | 800ms | linear | Infinite |
| Commit page entry | opacity, transform | 400ms | ease-out | IntersectionObserver |

### Commit page entry animation
When a commit page scrolls into view (enters the viewport via snap), its content should **fade in and shift up slightly**:
- Start: `opacity: 0; transform: translateY(12px)`
- End: `opacity: 1; transform: translateY(0)`
- Duration: `400ms`, easing: `ease-out`
- Implementation: Use `IntersectionObserver` on each `.commit-page` element. When it enters the viewport (threshold `0.3`), add class `.visible`. CSS handles the animation.
- This creates a subtle "page turn reveal" effect. The text appears gently, not suddenly.

```css
.commit-page {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}
.commit-page.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 9. Accessibility

- **Semantic HTML**: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<h1>`, `<h2>`
- `<html lang="en">`
- Skip-to-content: `<a href="#main-content" class="sr-only sr-only-focusable">Skip to content</a>` — visually hidden, appears on Tab focus
- Repo list items: `<a>` tags (keyboard navigable, announced by screen readers)
- Back button: `<button aria-label="Back to repositories">`
- Spinner: `<div role="status" aria-label="Loading"><span class="sr-only">Loading...</span></div>`
- Errors: `role="alert"`
- Commit pages: `<article>` with `<h2>` for the title
- Focus management:
  - Entering reader → focus the chapter title page
  - Going back → focus the repo card that was last tapped
- Color contrast: WCAG AAA (7:1) for all body text
- `focus-visible` outlines on all interactive elements: `2px solid var(--accent)`, `outline-offset: 2px`

### sr-only utility
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 10. Micro-details that must be right

1. **Scroll snap tuning**: `scroll-snap-type: y mandatory` on the container. `scroll-snap-align: start` on each page. `overscroll-behavior-y: contain` to prevent iOS bounce interfering. Test on real Safari iOS.

2. **Reading position memory**: Store `{ repoName: scrollPosition }` in a JS Map. On back navigation + return, restore scroll position. This is critical — losing your place is infuriating.

3. **Text selection**: `user-select: auto` on all text. Selection color: `::selection { background: var(--selection); }`. Users WILL want to copy quotes.

4. **Long messages**: Some Linus messages are 1000+ words. The commit page's `min-height: 100dvh` means the page grows. Scroll snap still works — the next commit starts at the next viewport boundary after the content ends.

5. **Rate limit grace**: On 403, show the error message but keep ALL already-loaded content readable. Never clear the DOM on error. The user can keep reading what's cached.

6. **No layout shift on load**: Title and tagline are in static HTML — they render instantly. The repo list fades in below them when data arrives. No elements jump.

7. **Back navigation is instant**: Repo list is cached. Going back never shows a spinner.

8. **Smooth font loading**: `font-display: swap` on Google Fonts. The page renders immediately with fallback fonts, then swaps to Source Serif 4 + Inter when loaded. Minimal reflow because the fallback fonts (Georgia, system-ui) are size-matched.

9. **The ornamental dots** (`·  ·  ·`): Exactly three middle dots, separated by two spaces each. `--text-tertiary` color. This is a book design convention called a "three-dot break" or "dinkus". It signals a section break without the heaviness of a horizontal rule.

10. **The small-caps lead-in**: Must use `font-variant: small-caps` (not `text-transform: uppercase` with smaller font-size — that's fake small caps and looks terrible). Source Serif 4 has proper small caps in its OpenType features.

---

## 11. What NOT to do

This is a reading app disguised as a website. Anything that reminds the user they're "on a website" is a failure.

- No hamburger menus, no sidebars, no drawers
- No footer of any kind
- No social buttons or share links. External links are OK only for: (1) URLs already present in commit messages (clickable, new tab), (2) Wikipedia smart links on technical terms (new tab). Both are subtle — dotted underline, secondary color, never intrusive.
- No tooltips, popovers, or hover cards
- No toasts, snackbars, or notifications
- No modals, dialogs, or overlays
- No skeleton screens (show a spinner, not gray rectangles)
- No parallax, scroll-jacking, or scroll-triggered animations (beyond the subtle entry fade)
- No icon library (use HTML entities: ← ↓ · ★)
- No favicon with a gradient (use a simple SVG or none)
- No analytics, no tracking, no cookies
- No "built with" footer
- No border-radius > 6px on anything (sharp = editorial)
- No box-shadows anywhere
- No background images or patterns
- No gradients
- No colored backgrounds (everything is `--bg` or `--bg-elevated`)
- No badges, pills, tags, or chips
- No numbered lists in the UI
- No progress bars with rounded ends (the reading progress bar is flat-ended)
