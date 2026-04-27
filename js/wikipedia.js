// wikipedia.js — Wikipedia smart link module
// Async post-render enhancement: detect candidate words, check Wikipedia API,
// add subtle dotted-underline links. Non-blocking, cached in localStorage.

import { COMMON_WORDS } from './wordlist.js';

const CACHE_KEY = 'linus-mind:wiki-cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX = 500;
const BATCH_SIZE = 5;
const BATCH_DELAY = 200;
const MAX_LOOKUPS_PER_PAGE = 20;
const BACKOFF_MS = 60_000;

let backoffUntil = 0;

// --- Cache ---

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch { return {}; }
}

function saveCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function getCached(word) {
  const cache = loadCache();
  const entry = cache[word];
  if (!entry) return null;
  if (Date.now() - entry.checkedAt > CACHE_TTL) return null;
  return entry;
}

function setCache(word, result) {
  const cache = loadCache();
  cache[word] = { ...result, checkedAt: Date.now() };

  // Prune oldest if over limit
  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX) {
    keys.sort((a, b) => (cache[a].checkedAt || 0) - (cache[b].checkedAt || 0));
    const toRemove = keys.length - CACHE_MAX;
    for (let i = 0; i < toRemove; i++) delete cache[keys[i]];
  }

  saveCache(cache);
}

// --- Candidate detection ---

export function isCandidate(word) {
  // Too short
  if (word.length < 3) return false;

  // Numbers, hex, SHAs
  if (/^\d/.test(word)) return false;
  if (/^0x[0-9a-fA-F]+$/.test(word)) return false;
  if (/^[0-9a-f]{7,}$/i.test(word)) return false;

  // Common English word
  if (COMMON_WORDS.has(word.toLowerCase())) return false;

  // ALL_CAPS (3+ chars) — strong candidate (TLB, RISC, DMA, ACPI)
  if (/^[A-Z][A-Z0-9]{2,}$/.test(word)) return true;

  // CamelCase — strong candidate (HyperTransport, FreeBSD)
  if (/^[A-Z][a-z]+[A-Z]/.test(word)) return true;

  // Capitalized mid-sentence (proper noun) — checked by caller context
  if (/^[A-Z][a-z]{2,}$/.test(word)) return true;

  return false;
}

// --- Wikipedia API ---

export async function checkWikipedia(word) {
  if (Date.now() < backoffUntil) {
    return { exists: false, url: null, title: null };
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`
    );

    if (res.status === 404) {
      const result = { exists: false, url: null, title: null };
      setCache(word, result);
      return result;
    }

    if (res.status === 429 || res.status >= 500) {
      backoffUntil = Date.now() + BACKOFF_MS;
      return { exists: false, url: null, title: null };
    }

    if (!res.ok) {
      return { exists: false, url: null, title: null };
    }

    const data = await res.json();

    if (data.type === 'standard' && data.content_urls?.desktop?.page) {
      const result = {
        exists: true,
        url: data.content_urls.desktop.page,
        title: data.title,
      };
      setCache(word, result);
      return result;
    }

    // disambiguation, no-extract, etc.
    const result = { exists: false, url: null, title: null };
    setCache(word, result);
    return result;
  } catch {
    // Network error — back off
    backoffUntil = Date.now() + BACKOFF_MS;
    return { exists: false, url: null, title: null };
  }
}

// --- DOM enhancement ---

function extractCandidatesFromElement(element) {
  const candidates = new Set();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  let node;
  while ((node = walker.nextNode())) {
    // Skip nodes inside <code>, <pre>, <blockquote>, trailers
    const parent = node.parentElement;
    if (parent && parent.closest('code, pre, blockquote, .commit-trailers, .wiki-link, a')) {
      continue;
    }

    const words = node.textContent.match(/[A-Za-z][A-Za-z0-9]{2,}/g);
    if (words) {
      for (const word of words) {
        if (isCandidate(word)) candidates.add(word);
      }
    }
  }

  return Array.from(candidates);
}

function wrapWordInLink(element, word, url) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && parent.closest('code, pre, blockquote, .commit-trailers, .wiki-link, a')) {
      continue;
    }

    const idx = node.textContent.indexOf(word);
    if (idx === -1) continue;

    // Only wrap whole-word matches
    const before = node.textContent[idx - 1];
    const after = node.textContent[idx + word.length];
    if (before && /\w/.test(before)) continue;
    if (after && /\w/.test(after)) continue;

    const textBefore = node.textContent.slice(0, idx);
    const textAfter = node.textContent.slice(idx + word.length);

    const link = document.createElement('a');
    link.className = 'wiki-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = word;

    const frag = document.createDocumentFragment();
    if (textBefore) frag.appendChild(document.createTextNode(textBefore));
    frag.appendChild(link);
    if (textAfter) frag.appendChild(document.createTextNode(textAfter));

    node.parentNode.replaceChild(frag, node);
    return; // Only wrap first occurrence per word
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function enhanceWithWikiLinks(commitBodyElement) {
  if (!commitBodyElement) return;

  const candidates = extractCandidatesFromElement(commitBodyElement);
  if (candidates.length === 0) return;

  // Prioritize: ALL_CAPS first, then CamelCase, then capitalized
  candidates.sort((a, b) => {
    const aScore = /^[A-Z]+$/.test(a) ? 0 : /[A-Z].*[A-Z]/.test(a) ? 1 : 2;
    const bScore = /^[A-Z]+$/.test(b) ? 0 : /[A-Z].*[A-Z]/.test(b) ? 1 : 2;
    return aScore - bScore;
  });

  let lookupCount = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    if (lookupCount >= MAX_LOOKUPS_PER_PAGE) break;
    if (Date.now() < backoffUntil) break;

    const batch = candidates.slice(i, i + BATCH_SIZE);

    for (const word of batch) {
      if (lookupCount >= MAX_LOOKUPS_PER_PAGE) break;

      // Check cache first
      const cached = getCached(word);
      if (cached) {
        if (cached.exists && cached.url) {
          wrapWordInLink(commitBodyElement, word, cached.url);
        }
        continue; // Don't count cached as a lookup
      }

      lookupCount++;
      const result = await checkWikipedia(word);
      if (result.exists && result.url) {
        wrapWordInLink(commitBodyElement, word, result.url);
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < candidates.length && lookupCount < MAX_LOOKUPS_PER_PAGE) {
      await delay(BATCH_DELAY);
    }
  }
}
