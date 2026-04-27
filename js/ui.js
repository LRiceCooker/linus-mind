// ui.js — DOM rendering functions (return DOM nodes, not innerHTML)
import { typeset } from './typography.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderRepoList(repos, progressData = {}) {
  const list = el('div', 'repo-list-items');

  repos.forEach((repo, i) => {
    const link = el('a', 'repo-card');
    link.href = `#/repo/${repo.name}`;

    const name = el('span', 'repo-name', repo.name);
    link.appendChild(name);

    if (repo.description) {
      const desc = document.createElement('em');
      desc.className = 'repo-description';
      desc.textContent = repo.description;
      link.appendChild(desc);
    }

    const meta = el('span', 'repo-meta');
    const parts = [];
    if (repo.language) parts.push(repo.language);
    if (repo.stars) parts.push(`${repo.stars} \u2605`);
    meta.textContent = parts.join(' \u00B7 ');
    link.appendChild(meta);

    // Show reading progress indicator
    const progress = progressData[repo.name];
    if (progress && progress.totalLoaded > 0) {
      const commitNum = progress.commitIndex + 1;
      const pct = Math.round(commitNum / progress.totalLoaded * 100);
      const hasMore = progress.page > 1 || progress.totalLoaded >= 30;
      const text = `commit ${commitNum} / ${progress.totalLoaded}${hasMore ? '+' : ''} (${pct}%)`;
      const indicator = el('span', 'repo-progress', text);
      link.appendChild(indicator);
    }

    list.appendChild(link);
  });

  return list;
}

export function renderChapterTitle(repo) {
  const page = el('div', 'chapter-title');
  page.setAttribute('tabindex', '-1');

  const content = el('div', 'chapter-title-content');

  const name = el('h1', 'chapter-name', repo.name);
  content.appendChild(name);

  if (repo.description) {
    const desc = document.createElement('em');
    desc.className = 'chapter-description';
    desc.textContent = repo.description;
    content.appendChild(desc);
  }

  const dinkus = el('div', 'dinkus');
  dinkus.setAttribute('aria-hidden', 'true');
  dinkus.innerHTML = '&middot;  &middot;  &middot;';
  content.appendChild(dinkus);

  page.appendChild(content);

  const prompt = el('div', 'scroll-prompt');
  const promptText = el('span', 'scroll-prompt-text', 'SCROLL TO BEGIN');
  prompt.appendChild(promptText);
  const arrow = el('span', 'scroll-prompt-arrow', '\u2193');
  prompt.appendChild(arrow);
  page.appendChild(prompt);

  return page;
}

function extractLeadIn(text) {
  // Take text up to first comma, period, colon, or dash — or first 4 words
  const punctMatch = text.match(/^(.+?[,.:;\u2014-])/);
  if (punctMatch && punctMatch[1].split(/\s+/).length <= 5) {
    return { leadIn: punctMatch[1], rest: text.slice(punctMatch[1].length) };
  }
  const words = text.split(/\s+/);
  if (words.length <= 4) {
    return { leadIn: text, rest: '' };
  }
  const leadIn = words.slice(0, 4).join(' ');
  return { leadIn, rest: text.slice(leadIn.length) };
}

export function renderCommitPage(commit, index, total, hasMore) {
  const article = el('article', 'commit-page');

  const column = el('div', 'reading-column');

  // Title
  const title = el('h2', 'commit-title', commit.title);
  column.appendChild(title);

  // Decorative rule + body (only if body exists)
  if (commit.body) {
    const rule = el('div', 'decorative-rule');
    rule.setAttribute('aria-hidden', 'true');
    column.appendChild(rule);

    const body = el('div', 'commit-body');
    body.innerHTML = typeset(commit.body);

    // Apply small-caps lead-in on the first <p>'s first text node
    const firstP = body.querySelector('p');
    if (firstP) {
      const walker = document.createTreeWalker(firstP, NodeFilter.SHOW_TEXT);
      const firstText = walker.nextNode();
      if (firstText && firstText.textContent.trim()) {
        const { leadIn, rest } = extractLeadIn(firstText.textContent);
        const leadSpan = el('span', 'lead-in', leadIn);
        firstText.textContent = rest;
        firstText.parentNode.insertBefore(leadSpan, firstText);
      }
    }

    column.appendChild(body);
  }

  // Metadata footer (pushed to bottom via margin-top: auto)
  const footer = el('footer', 'commit-footer');

  const metaRow = el('div', 'commit-meta-row');
  const date = el('span', 'commit-date', commit.formattedDate);
  metaRow.appendChild(date);
  const sha = el('code', 'commit-sha', commit.sha);
  metaRow.appendChild(sha);
  footer.appendChild(metaRow);

  const pct = Math.round(index / total * 100);
  const counterText = hasMore
    ? `${index} / ${total}+ \u00B7 ${pct}%`
    : `${index} / ${total} \u00B7 ${pct}%`;
  const counter = el('div', 'commit-counter');
  counter.textContent = counterText;
  footer.appendChild(counter);

  column.appendChild(footer);
  article.appendChild(column);

  return article;
}

export function renderSpinner() {
  const wrapper = el('div', 'spinner-wrapper');
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-label', 'Loading');

  const spinner = el('div', 'spinner');
  wrapper.appendChild(spinner);

  const srText = el('span', 'sr-only', 'Loading...');
  wrapper.appendChild(srText);

  return wrapper;
}

export function renderError(message) {
  const wrapper = el('div', 'error-message', message);
  wrapper.setAttribute('role', 'alert');
  return wrapper;
}
