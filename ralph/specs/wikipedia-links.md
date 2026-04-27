# Wikipedia Smart Links — linus-mind

## Concept

Detect non-common-English words in commit messages that might be technical concepts, tools, or proper nouns. Check if a Wikipedia article exists for them. If yes, render the word as a subtle link to the Wikipedia article.

## Detection: what to look up

Not every word should be checked. Apply these filters IN ORDER:

### Step 1 — Candidate extraction
From the commit body text (after typography parsing), extract words that are NOT in a common English dictionary. Candidates are:
- Words with unusual capitalization in the middle of a sentence: `TLB`, `RISC`, `ELF`, `ACPI`, `DMA`
- CamelCase words: `HyperTransport`, `PageTable`, `FreeBSD`
- Words that are proper nouns (capitalized, not at start of sentence): `Linux`, `Intel`, `ARM`, `Spectre`, `Meltdown`
- Technical compound words with hyphens: `write-back`, `copy-on-write`
- Known technical prefixes: words starting with `x86`, `arm64`, `riscv`, etc.

### Step 2 — Exclusion list
Do NOT look up:
- Common English words (use a compact word list — the top ~5000 most common English words, embedded in JS as a Set)
- Words already inside `<code>` tags (already styled as code)
- Words shorter than 3 characters
- Numbers, hex values, SHAs
- Git trailers content
- Words inside blockquotes (email quotes)
- File paths and function names (already handled by typography parser)
- Pronouns, articles, prepositions, conjunctions
- Words that appear in every commit (like "commit", "patch", "merge", "fix", "bug")

### Step 3 — Wikipedia API lookup
For each candidate word, check the Wikipedia API:

```
GET https://en.wikipedia.org/api/rest_v1/page/summary/{word}
```

- If the API returns a valid article (status 200 with `type: "standard"`), the word is linkable.
- If 404 or `type: "disambiguation"` or `type: "no-extract"`, skip.
- Rate limit: Wikipedia's REST API allows ~200 req/s for good actors, but we should be conservative.

### Caching Wikipedia results
- **localStorage** key: `linus-mind:wiki-cache`
- Value: JSON object `{ [word]: { exists: boolean, url: string|null, title: string|null, checkedAt: timestamp } }`
- TTL: 7 days — Wikipedia articles don't change that often
- Max 500 entries. Prune oldest on overflow.
- Cache negative results too (word has no article) — avoids re-checking every time.

### Rate limiting strategy
- Process candidates in batches of 5 with 200ms delay between batches
- Max 20 lookups per commit page render (pick the most likely candidates first — ALL_CAPS and CamelCase words first)
- If a word is already in the cache (positive or negative), skip the API call
- On Wikipedia API error (429, 5xx), stop all lookups for 60 seconds (backoff)
- Wikipedia lookups happen AFTER the page is rendered — they enhance the text asynchronously

## Rendering

### Link style
When a word has a Wikipedia article:
- Wrap in `<a href="https://en.wikipedia.org/wiki/{title}" class="wiki-link" target="_blank" rel="noopener noreferrer">`
- CSS:
```css
.commit-body .wiki-link {
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px dotted var(--text-tertiary);
  transition: border-color 200ms ease;
}
.commit-body .wiki-link:hover {
  border-bottom-color: var(--accent);
}
.commit-body .wiki-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```
- The link is **extremely subtle** — just a dotted underline in tertiary color. It doesn't scream "this is a link". On hover, the underline shifts to accent gold.
- `target="_blank"` with `rel="noopener noreferrer"` — opens in new tab on desktop
- On mobile: same behavior (new tab). iOS Safari and Chrome Android handle new tabs well — the user can swipe back to the reading tab easily.

### Async enhancement
Wikipedia links are NOT blocking. The flow is:
1. Render the commit page with typeset text (no wiki links yet)
2. After render, scan the text for candidate words
3. Check cache → if cached, enhance immediately
4. For uncached candidates, fetch Wikipedia API in background batches
5. As results come in, enhance the text by wrapping matched words in `<a>` tags
6. This means the text appears instantly and links appear gradually (0.5-2s later)

### Implementation
Create `js/wikipedia.js` module:
- `enhanceWithWikiLinks(commitBodyElement)` — scans text nodes, extracts candidates, checks cache, fetches API, enhances DOM
- `isCommonEnglishWord(word)` — checks against embedded word list
- `checkWikipedia(word)` — fetches API, caches result, returns `{ exists, url, title }`
- `getWordList()` — returns the Set of common English words

The common English word list should be in a separate file `js/wordlist.js` exporting a Set. Use the top ~3000 most frequent English words — enough to filter noise, small enough to embed (~30KB).

## Architecture note

This feature is a **post-render enhancement** — it never blocks or slows down the initial render. If Wikipedia is down or rate-limited, the text just doesn't have links. Zero degradation of the core reading experience.
