// app.js — Routing, view orchestration, events

import { fetchRepos } from './github.js';
import { renderRepoList, renderSpinner, renderError } from './ui.js';

const repoView = document.getElementById('repo-view');
const repoListSection = repoView.querySelector('.repo-list');

let cachedRepoListEl = null;

async function loadRepoList() {
  // Use cached DOM if available (back navigation is instant)
  if (cachedRepoListEl) {
    repoListSection.replaceChildren(cachedRepoListEl);
    return;
  }

  const spinner = renderSpinner();
  repoListSection.replaceChildren(spinner);

  try {
    const repos = await fetchRepos();
    cachedRepoListEl = renderRepoList(repos);
    repoListSection.replaceChildren(cachedRepoListEl);
  } catch (err) {
    const message = err.status === 403
      ? 'GitHub needs a moment. Come back shortly.'
      : 'Something went wrong.';
    repoListSection.replaceChildren(renderError(message));
  }
}

function route() {
  const hash = location.hash || '#/';

  if (hash === '#/' || hash === '#' || hash === '') {
    repoView.hidden = false;
    loadRepoList();
  }
}

// Initial route
route();

// Listen for hash changes
window.addEventListener('hashchange', route);
