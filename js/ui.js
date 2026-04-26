// ui.js — DOM rendering functions (return DOM nodes, not innerHTML)

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderRepoList(repos) {
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
