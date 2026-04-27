# Instructions

You are a development agent working on **linus-mind**, a minimalist literary web reader for Linus Torvalds' commit messages.

## Context — read these files first
- `ralph/CLAUDE.md`: agent context, stack, rules, learnings
- `ralph/fix_plan.md`: prioritized task list
- `ralph/specs/project.md`: full project specifications (screens, user flow, architecture, API, caching, E2E test specs)
- `ralph/specs/design.md`: **design system** — colors, typography, spacing, components, responsive, accessibility. Follow **strictly and to the letter**. Every pixel matters.
- `ralph/specs/typography-parser.md`: **typography parser spec** — how to transform raw commit text into beautifully typeset HTML (smart quotes, em dashes, code spans, blockquotes, trailers, paragraphs). Follow the transformation pipeline order exactly.
- `ralph/specs/wikipedia-links.md`: **Wikipedia smart links spec** — async post-render enhancement that detects non-common-English words, checks Wikipedia API, and adds subtle dotted-underline links. Non-blocking, cached in localStorage.

## Stack
- Pure HTML5, CSS3, vanilla JavaScript (ES modules)
- No framework, no build tools, no runtime dependencies
- Google Fonts: `Source Serif 4` (400, 700) for reading typography
- GitHub REST API v3 via browser `fetch()`
- Playwright for E2E testing
- Deployed on GitHub Pages (static only)

## Workflow per iteration
1. Read `ralph/fix_plan.md` and pick the **first `[ ]` task** (uncompleted)
2. **Move that task to the "In Progress" section** of ralph/fix_plan.md
3. Search existing code to avoid duplicates
4. Implement the task
5. If the task has E2E tests → run `npx playwright test` to validate
6. If it works → mark the task `[x]` and **move it to the "Completed" section** of ralph/fix_plan.md, then commit
7. If it doesn't work → fix and retry (do not give up)
8. Note decisions/learnings in `ralph/CLAUDE.md`
9. **When ALL tasks in ralph/fix_plan.md are completed** (no `[ ]` remaining), create a file `ralph/done.md` with the text "All tasks completed." and commit it.

## Strict rules
- **ONE task per iteration** — never take multiple
- Never ignore browser console errors
- Always commit working code before finishing
- **NEVER add Co-Authored-By, Co-authored-by, or any co-signing trailer to commits. NEVER mention Claude, Anthropic, or any AI in commit messages. The sole author of all commits is LRiceCooker. This is an absolute rule with zero exceptions.**
- No backend — everything runs in the browser via `fetch()`
- GitHub API calls: no auth token, no `gh` CLI — public endpoints only
- **Mobile-first responsive design** — always start with the mobile layout, then add breakpoints
- **Follow ralph/specs/design.md strictly** for all UI work — every font size, every color token, every spacing value
- All UI text in English
- Keep it minimal — no features beyond the specs
- **Semantic HTML** — use the right elements (`<a>`, `<button>`, `<article>`, `<nav>`, etc.)
- **Accessibility** — WCAG AAA contrast, focus-visible states, aria-labels, skip-to-content link

## E2E testing rules
- Tests live in `tests/e2e/`
- Config: `tests/e2e/playwright.config.js`
- **Every feature task must have corresponding E2E tests** — implement the feature first, then write tests
- Mock GitHub API in tests using `page.route()` to intercept `api.github.com` calls
- Store mock data in `tests/e2e/fixtures/` as JSON files
- Run tests: `npx playwright test`
- Debug a single test: `npx playwright test tests/e2e/{file}.spec.js --headed`
- Tests must pass before committing
- If a test fails → fix the code or the test, never delete a failing test

## Design philosophy (from specs/design.md)
> The interface should be invisible. The words are the product.
> Think of it as a digital book, not a web app.

This means:
- When you're unsure about a design choice, choose the simpler option
- When you're unsure about spacing, add more whitespace
- When you're unsure about a feature, don't add it
- Text readability is the #1 priority — always
