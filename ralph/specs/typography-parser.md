# Typography Parser — linus-mind

> The goal: take raw commit message text and produce beautifully typeset HTML.
> This is not Markdown rendering. This is editorial typesetting for Linus Torvalds' very specific writing style.

## Linus' writing style — real examples

Before implementing anything, understand HOW Linus writes. These patterns come from actual commits in test-tlb and subsurface-for-dirk:

### He uses TAB-indented blocks for code, terminal output, and examples
```
For example, on my i7-6700K, I get

	[torvalds@i7 test-tlb]$ ./test-tlb 16k 12
	  1.29ns (~5.0 cycles)

	[torvalds@i7 test-tlb]$ ./test-tlb 16k 11
	  1.36ns (~5.3 cycles)

which means that the unaligned load case is actually very low
```
Lines starting with a TAB after a blank line = a code/output block. This is his most common formatting for showing data.

### He uses single quotes for code identifiers (NOT backticks)
```
So let's rename it to something that actually describes what it does
...
So now it's called 'remote_repo_uptodate()', and it returns true if...
```
He wraps function names, variables, struct names in `'single quotes'`: `'alarm(1)'`, `'struct git_info'`, `'saved_git_id'`, `'dry_run'`, `'is_git_repository()'`. This is his primary way of marking code in prose.

### He uses lettered and numbered lists with parentheses
```
We do this by:

 (a) generating a mask of sensor numbers seen

 (b) checking if that mask is a subset of the cylinders we have, in
     which case everything is fine.

 (c) if it's not a subset, "compress" the sensor indexes
```
And numbered:
```
 (1) in the git save format, we don't rewrite dives unless...

 (2) if you had multiple dive computers, and one dive computer...
```
These are indented with a space, use `(a)` or `(1)` format, and continuation lines are aligned.

### He uses *asterisks* for emphasis
```
the *common* git save situation is that we save locally
```
`*word*` = emphasis. He does NOT use Markdown bold `**word**`.

### He uses NOTE!, IMPORTANT, etc. as attention markers
```
NOTE! We could try to improve on this by instead noticing that...
```
All-caps words followed by `!` are callouts.

### He uses double dots `..` as narrative continuation
```
.. at least if the local repository exists and can be opened.
```
```
.. with hugetlb and without.
```
Two dots at the start of a line = elliptical continuation of the title. It's a narrative device.

### He uses `(*)` as inline footnotes
```
(*) There may be other costs, like just resource use costs.
```
A parenthetical asterisk marks a footnote or aside.

### He indents git data/structured examples
```
	suit "5mm long + 3mm hooded vest"
	notes "First boat dive.
		Giant-stride entry."
		Saw a turtle."
	cylinder vol=10.0l description="10.0ℓ" depth=66.019m
```

### His trailers are varied
```
Signed-off-by: Linus Torvalds <torvalds@linux-foundation.org>
Reported-by: Christian Borntraeger <christian@borntraeger.net>
Requested-by: Dirk Hohndel <dirk@hohndel.org>
Signed-off-by: Dirk Hohndel <dirk@hohndel.org>
```
Often multiple, sometimes from different people.

---

## Overview

Create `js/typography.js` exporting:

```js
export function typeset(rawText) → HTMLString
```

Takes a raw commit message body (plain text), returns sanitized HTML with typographic enhancements. Output is set via `innerHTML` (safe because we escape first).

**CRITICAL**: HTML-escape ALL user text FIRST, then apply transformations. Never insert raw user text without escaping.

---

## Transformation pipeline

Apply in this exact order. Each step works on the result of the previous step.

### Step 1 — Sanitize
HTML-escape the raw text: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`, `"` → `&quot;`
Do NOT escape single quotes here (we need them for Linus' code quoting in step 5).

### Step 2 — Detect and extract structural blocks

Before doing inline transformations, identify structural blocks that should NOT be transformed by inline rules:

**TAB-indented code blocks**: A blank line followed by one or more lines starting with TAB = a code block. Extract these and replace with a placeholder. They will be wrapped in `<pre><code>` later.

Detection: scan line by line. When you see `\n\n\t` (blank line then tabbed line), collect all consecutive tabbed lines into a block. Strip one leading TAB from each line.

**Git trailers**: Lines at the END of the message matching `^(Signed-off-by|Acked-by|Reviewed-by|Tested-by|Reported-by|Requested-by|Cc|Link|Fixes):`. Collect all consecutive trailing trailer lines. Strip email addresses (content inside `<...>`). These go into a `<footer>` block.

Store extracted blocks with placeholders like `%%CODE_BLOCK_0%%`, `%%TRAILERS%%` so inline transforms don't touch them.

### Step 3 — Smart quotes
- `"text"` → `\u201Ctext\u201D` (curly double quotes)
- Apostrophes in words: `don't` → `don\u2019t`, `it's` → `it\u2019s`, `Linus'` → `Linus\u2019`
- Year abbreviations: `'05` → `\u201905`
- **DO NOT touch single quotes around code identifiers** — those are handled in step 5

### Step 4 — Dashes and ellipsis
- `--` → `\u2014` (em dash). But NOT inside code blocks (already extracted).
- `...` → `\u2026` (ellipsis). Also `.. ` at start of a line stays as-is (that's Linus' continuation style — see step 9).
- Don't touch single hyphens in compound words.

### Step 5 — Inline code from single quotes

This is the KEY Linus-specific rule. He uses `'identifier'` to mark code:

- `'function_name()'` → `<code>function_name()</code>`
- `'struct something'` → `<code>struct something</code>`
- `'MACRO_NAME'` → `<code>MACRO_NAME</code>`
- `'variable_name'` → `<code>variable_name</code>`

**Detection heuristic**: text between single quotes where the content looks like code:
- Contains `_` (snake_case)
- Contains `()` (function call)
- Starts with `struct `, `enum `, `union `, `typedef `
- Is ALL_CAPS_WITH_UNDERSCORES
- Contains `.` path separators (`file.c`)
- Contains `->` or `::` (member access)
- Starts with `CONFIG_`
- Is a single lowercase word that looks like a variable (`buf`, `ptr`, `fd`, `len`)

If the content between single quotes matches any of these → `<code>content</code>`.
If it doesn't look like code (e.g., `'this is normal quoted text'`) → apply curly single quotes: `\u2018content\u2019`.

Also detect without quotes:
- Backtick-quoted: `` `something` `` → `<code>something</code>`
- `CONFIG_SOMETHING` (all caps + underscores, starts with CONFIG_) → `<code>`
- `0x[0-9a-fA-F]+` (hex values) → `<code>`

### Step 6 — Emphasis
- `*word*` or `*multiple words*` → `<em>word</em>` (italic)
- Only when the asterisks are at word boundaries (space or start/end of line before/after)
- Don't match `**` (that's not Linus' style)
- Don't match `*` in the middle of words or in pointer syntax like `char *p`

### Step 7 — Callouts
- Lines starting with `NOTE!` or `NOTE:` → wrap in `<strong class="callout">NOTE!</strong>` rest of line
- Same for `IMPORTANT!`, `WARNING!`, `FIXME:`, `TODO:`
- These are attention markers — bold, slightly different treatment.

CSS:
```css
.commit-body .callout {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 0.85em;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
```

### Step 8 — Narrative continuation (`..`)
Lines starting with `.. ` (two dots + space) are Linus' continuation from the title. Style them distinctly:
- Wrap in `<span class="continuation">` with em dash prefix
- `.. at least if the local repository exists` → `<span class="continuation">\u2014 at least if the local repository exists</span>`

CSS:
```css
.commit-body .continuation {
  font-style: italic;
  color: var(--text-secondary);
}
```

### Step 9 — Footnotes (`(*)`)
Lines starting with `(*)` are inline footnotes/asides:
- Wrap the `(*)` marker in `<span class="footnote-marker">`
- Keep the rest as normal text

CSS:
```css
.commit-body .footnote-marker {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.9em;
}
```

### Step 10 — Email quotes
Lines starting with `&gt;` (escaped `>`) are email quotes:
- Consecutive `&gt;` lines → wrap in `<blockquote class="email-quote">`
- Strip the `&gt; ` prefix from displayed text
- Nested `&gt;&gt;` → nested blockquote or just deeper indent

CSS:
```css
.commit-body .email-quote {
  border-left: 2px solid var(--divider);
  padding-left: var(--space-4);
  margin: var(--space-4) 0;
  color: var(--text-secondary);
  font-style: italic;
}
```

### Step 11 — Lists

**Lettered lists**: lines matching `^ ?\([a-z]\) ` → `<ol type="a"><li>`
**Numbered lists**: lines matching `^ ?\([0-9]+\) ` → `<ol><li>`
**Bullet lists**: lines starting with ` - ` or `- ` or ` * ` or `* ` → `<ul><li>`

For all list types:
- Detect consecutive list lines (2+ to form a list)
- Continuation lines (indented to align with first line's text) belong to the same `<li>`
- Blank lines between list items are normal (Linus spaces them out)

CSS:
```css
.commit-body ol, .commit-body ul {
  padding-left: var(--space-6);
  margin: var(--space-4) 0;
}
.commit-body li {
  margin-bottom: var(--space-2);
  padding-left: var(--space-1);
}
.commit-body ul {
  list-style: none;
}
.commit-body ul > li::before {
  content: '\00B7';
  position: absolute;
  margin-left: calc(-1 * var(--space-4));
  color: var(--text-tertiary);
}
.commit-body ul > li {
  position: relative;
}
.commit-body ol {
  list-style-position: outside;
}
```

### Step 12 — Paragraphs and structure
- Split the text on double newlines (`\n\n`) into paragraph blocks
- Wrap each block in `<p>` tags
- Within each `<p>`, single `\n` are preserved by `white-space: pre-wrap`
- But: code blocks, lists, blockquotes, and trailers are already wrapped — don't double-wrap them

CSS:
```css
.commit-body p {
  margin-bottom: var(--space-4);
  white-space: pre-wrap;
  word-break: break-word;
}
.commit-body p:last-of-type {
  margin-bottom: 0;
}
```

### Step 13 — URLs
- Detect bare URLs: `https?://[^\s)]+`
- Wrap in `<span class="url">`
- NOT clickable (no `<a>` tags — this is a reading app)

CSS:
```css
.commit-body .url {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--text-secondary);
  word-break: break-all;
}
```

### Step 14 — Reinject structural blocks
Replace the `%%CODE_BLOCK_N%%` placeholders with the actual code block HTML:

```html
<pre class="code-block"><code>content here</code></pre>
```

Replace `%%TRAILERS%%` with:
```html
<footer class="commit-trailers">
  <span class="trailer">Signed-off-by: Linus Torvalds</span>
  <span class="trailer">Reported-by: Someone</span>
</footer>
```

CSS for code blocks:
```css
.commit-body .code-block {
  background: var(--bg-hover);
  border-radius: 4px;
  padding: var(--space-3) var(--space-4);
  margin: var(--space-4) 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.85em;
  line-height: 1.6;
  color: var(--text);
  white-space: pre;
  -webkit-overflow-scrolling: touch;
}
.commit-body .code-block code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}
.commit-trailers {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--divider);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  line-height: 1.8;
}
.commit-trailers .trailer {
  display: block;
}
```

---

## Integration

In `js/ui.js`, the `renderCommitPage` function currently sets the body text. Change to:

1. Pass raw body through `typeset(rawBody)`
2. Set result via `innerHTML` (safe — step 1 escapes all user input)
3. Apply the small-caps lead-in AFTER typesetting — target the first `<p>` element's first text node
4. The decorative rule and metadata remain unchanged

---

## Edge cases to handle

1. **Empty body or whitespace-only** → return empty string, don't render body
2. **Commit messages that are ALL trailers** (no prose) → show trailers only, no body
3. **Nested quotes** (`>> text`) → flatten to single blockquote level (don't over-nest)
4. **Mixed indentation** (spaces vs tabs) → treat 4+ leading spaces same as TAB for code blocks
5. **Single-line commits** (title only, no body at all) → `typeset` is not called
6. **Very long code blocks** → `overflow-x: auto` with horizontal scroll, NOT wrapping
7. **Consecutive empty lines** → collapse to one paragraph break
8. **Trailers in the middle of a message** (rare) → only treat as trailers if they're at the END
9. **`'quoted text that isn't code'`** → must distinguish from code quotes. The heuristic (step 5) handles this. When in doubt, prefer curly quotes over code.

---

## What NOT to do

- Don't convert Markdown syntax (`**bold**`, `## header`, `[link](url)`) — Linus doesn't write Markdown
- Don't syntax-highlight code blocks — this is a reader, not a code editor
- Don't make URLs clickable — no external links (design.md §11)
- Don't touch indentation within code blocks — preserve exactly
- Don't create `<h3>` or sub-headers from lines ending with `:` — they're just prose
- Don't convert `#123` to issue links
- Don't add line numbers to code blocks
- Don't add "copy" buttons to code blocks

---

## Testing

`tests/e2e/typography.spec.js` should verify:
1. Smart double quotes: `"text"` → curly quotes in DOM
2. Em dash: `--` → `—` character
3. Ellipsis: `...` → `…`
4. Single-quoted code: `'function_name()'` → `<code>` element
5. TAB-indented block → `<pre class="code-block">` element
6. Emphasis: `*word*` → `<em>` element
7. Email quote: `> quoted text` → `<blockquote>` element
8. Lettered list: `(a) item` → `<ol>` element
9. Git trailers → `.commit-trailers` footer element, no email addresses visible
10. XSS prevention: `<script>alert('xss')</script>` → escaped, no script execution
11. `NOTE!` → `.callout` element
12. Continuation `..` → `.continuation` element
13. Code block preserves indentation exactly
14. Paragraphs: double newline → separate `<p>` elements
