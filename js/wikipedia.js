// wikipedia.js — Wikipedia smart link module
// Async post-render enhancement: detect candidate words, check Wikipedia API,
// add subtle dotted-underline links. Non-blocking, cached in localStorage.

import { COMMON_WORDS, loadWordList, isWordListLoaded } from './wordlist.js';

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
  const entry = cache[word.toLowerCase()];
  if (!entry) return null;
  if (Date.now() - entry.checkedAt > CACHE_TTL) return null;
  return entry;
}

function setCache(word, result) {
  const cache = loadCache();
  cache[word.toLowerCase()] = { ...result, checkedAt: Date.now() };

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

  // Hyphenated terms — technical compound (copy-on-write, x86-64, write-back)
  if (word.includes('-')) return true;

  // ALL_CAPS (3+ chars) — strong candidate (TLB, RISC, DMA, ACPI)
  if (/^[A-Z][A-Z0-9]{2,}$/.test(word)) return true;

  // CamelCase — strong candidate (HyperTransport, FreeBSD)
  if (/^[A-Z][a-z]+[A-Z]/.test(word)) return true;

  // Capitalized mid-sentence (proper noun) — checked by caller context
  if (/^[A-Z][a-z]{2,}$/.test(word)) return true;

  return false;
}

// --- Wikipedia API ---

const TECH_KEYWORDS = [
  'software', 'hardware', 'computer', 'programming', 'protocol',
  'algorithm', 'processor', 'memory', 'kernel', 'operating',
  'system', 'data', 'network', 'interface', 'binary',
  'code', 'digital', 'electronic', 'specification',
];

function isRelevantArticle(word, data) {
  // Reject disambiguation pages that slipped through type check
  const desc = (data.description || '').toLowerCase();
  if (desc.includes('disambiguation') || desc.includes('may refer to')) {
    return false;
  }

  // For ALL_CAPS words, verify the article is tech-related
  if (/^[A-Z][A-Z0-9]{2,}$/.test(word)) {
    const extract = (data.extract || '').toLowerCase();
    const hasTechContext = TECH_KEYWORDS.some(kw => extract.includes(kw));
    const hasWikibaseItem = !!data.wikibase_item;
    // Accept if tech-related OR has a wikibase item (established concept)
    if (!hasTechContext && !hasWikibaseItem) {
      return false;
    }
  }

  return true;
}

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
      // Apply relevance filtering
      if (!isRelevantArticle(word, data)) {
        const result = { exists: false, url: null, title: null };
        setCache(word, result);
        return result;
      }

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

// --- GitHub API fallback ---

let githubBackoffUntil = 0;

function looksLikeProjectName(word) {
  // CamelCase (HyperTransport, FreeBSD)
  if (/^[A-Z][a-z]+[A-Z]/.test(word)) return true;
  // ALL_CAPS (ACPI, DMA)
  if (/^[A-Z][A-Z0-9]{2,}$/.test(word)) return true;
  // Hyphenated (copy-on-write, x86-64)
  if (word.includes('-')) return true;
  return false;
}

async function checkGitHub(word) {
  if (Date.now() < githubBackoffUntil) {
    return { exists: false, url: null };
  }

  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(word)}&per_page=1`
    );

    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      githubBackoffUntil = Date.now() + BACKOFF_MS;
      return { exists: false, url: null };
    }

    if (!res.ok) {
      return { exists: false, url: null };
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const repo = data.items[0];
      if (
        repo.stargazers_count > 100 &&
        repo.name.toLowerCase() === word.toLowerCase()
      ) {
        const result = { exists: true, url: repo.html_url, title: repo.full_name, source: 'github' };
        setCache(word, result);
        return result;
      }
    }

    const result = { exists: false, url: null };
    setCache(word, result);
    return result;
  } catch {
    githubBackoffUntil = Date.now() + BACKOFF_MS;
    return { exists: false, url: null };
  }
}

// --- DOM enhancement ---

function extractCandidatesFromElement(element) {
  // Map from lowercase → first-seen casing (for case-insensitive dedup)
  const seen = new Map();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  let node;
  while ((node = walker.nextNode())) {
    // Skip nodes inside <code>, <pre>, <blockquote>, trailers
    const parent = node.parentElement;
    if (parent && parent.closest('code, pre, blockquote, .commit-trailers, .wiki-link, a')) {
      continue;
    }

    const words = node.textContent.match(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*/g);
    if (words) {
      for (const word of words) {
        const key = word.toLowerCase();
        if (!seen.has(key) && isCandidate(word)) {
          seen.set(key, word); // store first occurrence's casing
        }
      }
    }
  }

  return Array.from(seen.values());
}

function wrapWordInLink(element, word, url, className = 'wiki-link') {
  // Build a case-insensitive whole-word regex
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'i');

  // Collect all matching text nodes first, then mutate (avoids walker invalidation)
  const nodesToWrap = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && parent.closest('code, pre, blockquote, .commit-trailers, .wiki-link, a')) {
      continue;
    }
    if (pattern.test(node.textContent)) {
      nodesToWrap.push(node);
    }
  }

  for (const textNode of nodesToWrap) {
    // Split text node into parts, wrapping all matches
    const parts = [];
    let remaining = textNode.textContent;

    while (remaining) {
      const match = pattern.exec(remaining);
      if (!match) {
        parts.push(document.createTextNode(remaining));
        break;
      }
      if (match.index > 0) {
        parts.push(document.createTextNode(remaining.slice(0, match.index)));
      }
      const link = document.createElement('a');
      link.className = className;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = match[0]; // preserve original casing
      parts.push(link);
      remaining = remaining.slice(match.index + match[0].length);
    }

    if (parts.length > 1) {
      const frag = document.createDocumentFragment();
      for (const part of parts) frag.appendChild(part);
      textNode.parentNode.replaceChild(frag, textNode);
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function enhanceWithWikiLinks(commitBodyElement) {
  if (!commitBodyElement) return;

  // Ensure word list is loaded before checking candidates
  if (!isWordListLoaded()) {
    await loadWordList();
  }

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

      let fullFormResolved = false;

      // Check cache first for full word
      const cached = getCached(word);
      if (cached) {
        if (cached.exists && cached.url) {
          const cls = cached.source === 'github' ? 'wiki-link github-link' : 'wiki-link';
          wrapWordInLink(commitBodyElement, word, cached.url, cls);
          continue;
        }
        fullFormResolved = true; // negative cache hit
      }

      if (!fullFormResolved) {
        lookupCount++;
        const result = await checkWikipedia(word);
        if (result.exists && result.url) {
          wrapWordInLink(commitBodyElement, word, result.url);
          continue;
        }

        // Wikipedia failed — try GitHub for project-like names
        if (looksLikeProjectName(word)) {
          lookupCount++;
          const ghResult = await checkGitHub(word);
          if (ghResult.exists && ghResult.url) {
            wrapWordInLink(commitBodyElement, word, ghResult.url, 'wiki-link github-link');
            continue;
          }
        }
      }

      // Full form failed — for hyphenated words, try individual parts
      if (word.includes('-')) {
        const parts = word.split('-').filter(p => isCandidate(p));
        for (const part of parts) {
          if (lookupCount >= MAX_LOOKUPS_PER_PAGE) break;
          const partCached = getCached(part);
          if (partCached) {
            if (partCached.exists && partCached.url) {
              wrapWordInLink(commitBodyElement, part, partCached.url);
            }
            continue;
          }
          lookupCount++;
          const partResult = await checkWikipedia(part);
          if (partResult.exists && partResult.url) {
            wrapWordInLink(commitBodyElement, part, partResult.url);
          }
        }
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < candidates.length && lookupCount < MAX_LOOKUPS_PER_PAGE) {
      await delay(BATCH_DELAY);
    }
  }
}
