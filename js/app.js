// app.js — Routing, view orchestration, events

import { fetchRepos, fetchCommits, getRateLimitInfo } from './github.js';
import {
  renderRepoList, renderChapterTitle, renderCommitPage,
  renderSpinner, renderError
} from './ui.js';

// Rate-limit bar
const rateLimitBar = document.getElementById('rate-limit-bar');

function checkRateLimit() {
  const { remaining, resetAt } = getRateLimitInfo();
  if (remaining === null || remaining > 5) {
    rateLimitBar.style.display = 'none';
    rateLimitBar.classList.remove('visible');
    return;
  }
  rateLimitBar.style.display = '';
  // Force reflow so the opacity transition fires
  rateLimitBar.offsetHeight;
  rateLimitBar.classList.add('visible');
  if (remaining === 0 && resetAt) {
    const d = new Date(resetAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    rateLimitBar.textContent = `GitHub API limit reached \u2014 resets at ${hh}:${mm}.`;
  } else {
    rateLimitBar.textContent = 'GitHub API limit nearly reached \u2014 cached content still available.';
  }
}

// Filter out commits with empty/whitespace-only messages and deduplicate by SHA
function filterEmptyCommits(commits) {
  const seen = new Set();
  return commits.filter(c => {
    // Skip if entire message is empty/whitespace
    if (!(c.title + c.body).trim()) return false;
    // Deduplicate consecutive commits with same SHA
    if (seen.has(c.sha)) return false;
    seen.add(c.sha);
    return true;
  });
}

// --- Reading progress persistence ---
const PROGRESS_KEY = 'linus-mind:progress';
const PROGRESS_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const PROGRESS_MAX_ENTRIES = 20;

function getAllProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch { return {}; }
}

function saveProgress(repo, data) {
  const all = getAllProgress();
  all[repo] = { ...data, updatedAt: Date.now() };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

function loadProgress(repo) {
  return getAllProgress()[repo] || null;
}

function cleanupProgress() {
  const all = getAllProgress();
  const now = Date.now();
  // Remove entries older than 30 days
  for (const key of Object.keys(all)) {
    if (now - (all[key].updatedAt || 0) > PROGRESS_MAX_AGE) {
      delete all[key];
    }
  }
  // Cap at 20 entries — remove oldest
  const entries = Object.entries(all);
  if (entries.length > PROGRESS_MAX_ENTRIES) {
    entries.sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
    const toRemove = entries.length - PROGRESS_MAX_ENTRIES;
    for (let i = 0; i < toRemove; i++) {
      delete all[entries[i][0]];
    }
  }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

// Debounced progress save
let progressSaveTimer = null;
let currentCommitIndex = 0;

function debouncedSaveProgress() {
  if (progressSaveTimer) return;
  progressSaveTimer = setTimeout(() => {
    progressSaveTimer = null;
    if (currentRepo) {
      saveProgress(currentRepo, {
        commitIndex: currentCommitIndex,
        page: currentPage,
        totalLoaded: allCommits.length,
      });
    }
  }, 1000);
}

// Clean up old progress on app load
cleanupProgress();

// DOM references
const repoView = document.getElementById('repo-view');
const readerView = document.getElementById('reader-view');
const repoListSection = repoView.querySelector('.repo-list');
const scrollContainer = readerView.querySelector('.scroll-container');
const topBar = readerView.querySelector('.top-bar');
const topBarTitle = readerView.querySelector('.top-bar-title');
const backButton = readerView.querySelector('.back-button');
const progressBar = readerView.querySelector('.progress-bar');

// State
let cachedRepoListEl = null;
const scrollPositions = new Map();
let currentRepo = null;
let allCommits = [];
let currentPage = 0;
let hasMoreCommits = false;
let isLoadingMore = false;
let entryObserver = null;
let infiniteScrollObserver = null;

// --- Repo list ---

async function loadRepoList() {
  if (cachedRepoListEl) {
    repoListSection.replaceChildren(cachedRepoListEl);
    return;
  }

  const spinner = renderSpinner();
  repoListSection.replaceChildren(spinner);

  try {
    const repos = await fetchRepos();
    checkRateLimit();
    cachedRepoListEl = renderRepoList(repos, getAllProgress());
    repoListSection.replaceChildren(cachedRepoListEl);
  } catch (err) {
    checkRateLimit();
    const message = err.status === 403
      ? 'GitHub needs a moment. Come back shortly.'
      : 'Something went wrong.';
    repoListSection.replaceChildren(renderError(message));
  }
}

// --- Reader ---

function setupEntryObserver() {
  if (entryObserver) entryObserver.disconnect();
  entryObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { root: scrollContainer, threshold: 0.3 });
}

function observeCommitPages() {
  scrollContainer.querySelectorAll('.commit-page').forEach(page => {
    entryObserver.observe(page);
  });
}

function setupInfiniteScroll() {
  if (infiniteScrollObserver) infiniteScrollObserver.disconnect();
  infiniteScrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && hasMoreCommits && !isLoadingMore) {
        loadMoreCommits();
      }
    });
  }, { root: scrollContainer, threshold: 0.1 });

  updateInfiniteScrollTarget();
}

function updateInfiniteScrollTarget() {
  if (!infiniteScrollObserver) return;
  infiniteScrollObserver.disconnect();
  const pages = scrollContainer.querySelectorAll('.commit-page');
  if (pages.length >= 2) {
    infiniteScrollObserver.observe(pages[pages.length - 2]);
  }
}

function renderCommitPages(commits, startIndex, total, hasMore) {
  const fragment = document.createDocumentFragment();
  commits.forEach((commit, i) => {
    const page = renderCommitPage(commit, startIndex + i, total, hasMore);
    fragment.appendChild(page);
  });
  return fragment;
}

async function loadMoreCommits() {
  if (isLoadingMore || !hasMoreCommits) return;
  isLoadingMore = true;
  currentPage++;

  try {
    const result = await fetchCommits(currentRepo, currentPage);
    checkRateLimit();
    const newCommits = filterEmptyCommits(result.commits.reverse());
    hasMoreCommits = result.hasMore;

    allCommits = allCommits.concat(newCommits);
    allCommits.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Re-render all commit pages to maintain sort order
    const chapterTitle = scrollContainer.querySelector('.chapter-title');
    const spinner = scrollContainer.querySelector('.spinner-wrapper');
    scrollContainer.replaceChildren(chapterTitle);

    const total = allCommits.length;
    const fragment = renderCommitPages(allCommits, 1, total, hasMoreCommits);
    scrollContainer.appendChild(fragment);

    if (spinner) scrollContainer.appendChild(spinner);

    observeCommitPages();
    updateInfiniteScrollTarget();
  } catch (err) {
    // Keep existing content on error
  } finally {
    isLoadingMore = false;
  }
}

function updateProgressBar() {
  const pages = scrollContainer.querySelectorAll('.commit-page');
  if (!pages.length) {
    progressBar.style.width = '0%';
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const containerCenter = containerRect.top + containerRect.height / 2;
  let activeIndex = 0;

  pages.forEach((page, i) => {
    const rect = page.getBoundingClientRect();
    if (rect.top <= containerCenter) {
      activeIndex = i + 1;
    }
  });

  // Track current commit index for progress persistence
  if (activeIndex > 0 && activeIndex !== currentCommitIndex) {
    currentCommitIndex = activeIndex - 1; // 0-based
    debouncedSaveProgress();
  }

  const progress = (activeIndex / pages.length) * 100;
  progressBar.style.width = `${progress}%`;
  progressBar.setAttribute('aria-valuenow', Math.round(progress));
}

// Top bar auto-hide
let lastScrollTop = 0;
let ticking = false;

function handleScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrollTop = scrollContainer.scrollTop;
    const threshold = window.innerWidth < 640 ? 50 : 80;

    if (scrollTop > threshold && scrollTop > lastScrollTop) {
      topBar.classList.add('hidden');
    } else if (scrollTop < lastScrollTop) {
      topBar.classList.remove('hidden');
    }

    lastScrollTop = scrollTop;
    updateProgressBar();
    ticking = false;
  });
}

// Hide scroll prompt on first scroll
let promptHidden = false;
function handlePromptHide() {
  if (promptHidden) return;
  const prompt = scrollContainer.querySelector('.scroll-prompt');
  if (prompt && scrollContainer.scrollTop > 10) {
    prompt.style.opacity = '0';
    prompt.style.transition = 'opacity 300ms ease-out';
    promptHidden = true;
  }
}

async function loadReader(repoName) {
  currentRepo = repoName;
  currentPage = 1;
  allCommits = [];
  hasMoreCommits = false;
  isLoadingMore = false;
  promptHidden = false;
  lastScrollTop = 0;

  topBarTitle.textContent = repoName;
  topBar.classList.remove('hidden');
  progressBar.style.width = '0%';

  // Render chapter title page
  const chapterTitle = renderChapterTitle({ name: repoName, description: '' });
  scrollContainer.replaceChildren(chapterTitle);

  const spinner = renderSpinner();
  scrollContainer.appendChild(spinner);

  setupEntryObserver();

  // Add scroll listeners
  scrollContainer.addEventListener('scroll', handleScroll);
  scrollContainer.addEventListener('scroll', handlePromptHide);

  try {
    // Fetch repo info for description
    const repos = await fetchRepos();
    checkRateLimit();
    const repo = repos.find(r => r.name === repoName);
    if (repo && repo.description) {
      const nameEl = chapterTitle.querySelector('.chapter-name');
      const descEl = chapterTitle.querySelector('.chapter-description');
      if (!descEl) {
        const desc = document.createElement('em');
        desc.className = 'chapter-description';
        desc.textContent = repo.description;
        nameEl.after(desc);
      }
    }

    const result = await fetchCommits(repoName, 1);
    checkRateLimit();
    const commits = filterEmptyCommits(result.commits.reverse());
    commits.sort((a, b) => new Date(a.date) - new Date(b.date)); // strict chronological
    hasMoreCommits = result.hasMore;
    allCommits = commits;

    scrollContainer.removeChild(spinner);

    const total = commits.length;
    const fragment = renderCommitPages(commits, 1, total, hasMoreCommits);
    scrollContainer.appendChild(fragment);

    observeCommitPages();
    setupInfiniteScroll();

    // Focus chapter title for accessibility
    chapterTitle.focus();

    // Restore reading progress from localStorage
    const savedProgress = loadProgress(repoName);
    if (savedProgress && savedProgress.commitIndex > 0) {
      const pages = scrollContainer.querySelectorAll('.commit-page');
      const targetPage = pages[savedProgress.commitIndex];
      if (targetPage) {
        targetPage.classList.add('visible'); // ensure it's visible
        targetPage.scrollIntoView({ behavior: 'instant' });
        currentCommitIndex = savedProgress.commitIndex;
      }
    } else {
      // Restore scroll position if returning within session
      const savedPos = scrollPositions.get(repoName);
      if (savedPos) {
        scrollContainer.scrollTop = savedPos;
      }
    }
  } catch (err) {
    checkRateLimit();
    scrollContainer.removeChild(spinner);
    const message = err.status === 403
      ? 'GitHub needs a moment. Come back shortly.'
      : 'Something went wrong.';
    scrollContainer.appendChild(renderError(message));
  }
}

function cleanupReader() {
  if (currentRepo) {
    scrollPositions.set(currentRepo, scrollContainer.scrollTop);
    // Invalidate cached repo list so progress indicator updates
    cachedRepoListEl = null;
  }
  scrollContainer.removeEventListener('scroll', handleScroll);
  scrollContainer.removeEventListener('scroll', handlePromptHide);
  if (entryObserver) entryObserver.disconnect();
  if (infiniteScrollObserver) infiniteScrollObserver.disconnect();
}

// --- Routing ---

let currentView = null;

function transitionViews(incoming, outgoing) {
  return new Promise(resolve => {
    if (!outgoing || outgoing.hidden) {
      incoming.hidden = false;
      incoming.classList.add('view-visible');
      incoming.classList.remove('view-hidden');
      resolve();
      return;
    }

    outgoing.classList.add('view-hidden');
    outgoing.classList.remove('view-visible');

    const onEnd = () => {
      outgoing.removeEventListener('transitionend', onEnd);
      outgoing.hidden = true;
      incoming.hidden = false;
      // Force reflow before adding visible class
      incoming.offsetHeight;
      incoming.classList.add('view-visible');
      incoming.classList.remove('view-hidden');
      resolve();
    };

    outgoing.addEventListener('transitionend', onEnd, { once: true });
    // Fallback if transition doesn't fire
    setTimeout(onEnd, 300);
  });
}

async function route() {
  const hash = location.hash || '#/';
  const repoMatch = hash.match(/^#\/repo\/(.+)$/);

  if (repoMatch) {
    const repoName = decodeURIComponent(repoMatch[1]);
    cleanupReader();
    const outgoing = !repoView.hidden ? repoView : null;
    await transitionViews(readerView, outgoing);
    currentView = 'reader';
    loadReader(repoName);
  } else {
    cleanupReader();
    const outgoing = !readerView.hidden ? readerView : null;
    await transitionViews(repoView, outgoing);
    currentView = 'repo';
    loadRepoList();
  }
}

// Back button
backButton.addEventListener('click', () => {
  location.hash = '#/';
});

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (currentView !== 'reader') return;

  switch (e.key) {
    case 'ArrowDown':
    case ' ':
    case 'PageDown':
      e.preventDefault();
      scrollContainer.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      break;
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault();
      scrollContainer.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
      break;
    case 'Escape':
    case 'Backspace':
      e.preventDefault();
      location.hash = '#/';
      break;
  }
});

// Save progress on beforeunload
window.addEventListener('beforeunload', () => {
  if (currentRepo && allCommits.length > 0) {
    saveProgress(currentRepo, {
      commitIndex: currentCommitIndex,
      page: currentPage,
      totalLoaded: allCommits.length,
    });
  }
});

// Initial route
route();

// Listen for hash changes
window.addEventListener('hashchange', route);
