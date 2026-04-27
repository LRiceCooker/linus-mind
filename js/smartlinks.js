// smartlinks.js — Multi-source smart link resolution module
// Async post-render enhancement: detect candidate words, check multiple sources
// (Wikipedia → Wiktionary → Wikidata → GitHub), add subtle dotted-underline links.
// Non-blocking, cached in localStorage.

import { COMMON_WORDS, loadWordList, isWordListLoaded } from './wordlist.js';

const CACHE_KEY = 'linus-mind:wiki-cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX = 500;
const BATCH_SIZE = 5;
const BATCH_DELAY = 200;
const MAX_LOOKUPS_PER_PAGE = 20;
const BACKOFF_MS = 60_000;

// Per-source backoff timers
const backoffs = {
  wikipedia: 0,
  wiktionary: 0,
  wikidata: 0,
  github: 0,
};

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
  // Backwards compat: old entries without source field are treated as "wikipedia"
  if (entry.exists && !entry.source) {
    entry.source = 'wikipedia';
  }
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
  if (Date.now() < backoffs.wikipedia) {
    return { exists: false, url: null, title: null, source: 'wikipedia' };
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`
    );

    if (res.status === 404) {
      return { exists: false, url: null, title: null, source: 'wikipedia' };
    }

    if (res.status === 429 || res.status >= 500) {
      backoffs.wikipedia = Date.now() + BACKOFF_MS;
      return { exists: false, url: null, title: null, source: 'wikipedia' };
    }

    if (!res.ok) {
      return { exists: false, url: null, title: null, source: 'wikipedia' };
    }

    const data = await res.json();

    if (data.type === 'standard' && data.content_urls?.desktop?.page) {
      // Apply relevance filtering
      if (!isRelevantArticle(word, data)) {
        return { exists: false, url: null, title: null, source: 'wikipedia' };
      }

      return {
        exists: true,
        url: data.content_urls.desktop.page,
        title: data.title,
        source: 'wikipedia',
      };
    }

    // disambiguation, no-extract, etc.
    return { exists: false, url: null, title: null, source: 'wikipedia' };
  } catch {
    // Network error — back off
    backoffs.wikipedia = Date.now() + BACKOFF_MS;
    return { exists: false, url: null, title: null, source: 'wikipedia' };
  }
}

// --- Wiktionary API ---

async function checkWiktionary(word) {
  if (Date.now() < backoffs.wiktionary) {
    return { exists: false, url: null, title: null, source: 'wiktionary' };
  }

  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`
    );

    if (res.status === 404) {
      return { exists: false, url: null, title: null, source: 'wiktionary' };
    }

    if (res.status === 429 || res.status >= 500) {
      backoffs.wiktionary = Date.now() + BACKOFF_MS;
      return { exists: false, url: null, title: null, source: 'wiktionary' };
    }

    if (!res.ok) {
      return { exists: false, url: null, title: null, source: 'wiktionary' };
    }

    const data = await res.json();

    // Must have at least one language entry with definitions
    if (!Array.isArray(data) || data.length === 0) {
      return { exists: false, url: null, title: null, source: 'wiktionary' };
    }

    // Look through all language entries (prefer English)
    let hasNoun = false;
    let hasAnyDefinition = false;

    for (const langEntry of data) {
      if (!Array.isArray(langEntry.definitions)) continue;
      for (const def of langEntry.definitions) {
        if (def.definition) {
          hasAnyDefinition = true;
          if (def.partOfSpeech === 'noun') {
            hasNoun = true;
          }
        }
      }
    }

    if (!hasAnyDefinition) {
      return { exists: false, url: null, title: null, source: 'wiktionary' };
    }

    // Skip words that only have adjective/adverb definitions (likely common words)
    if (!hasNoun) {
      const onlyAdjectiveAdverb = data.every(langEntry =>
        (langEntry.definitions || []).every(def =>
          def.partOfSpeech === 'adjective' || def.partOfSpeech === 'adverb'
        )
      );
      if (onlyAdjectiveAdverb) {
        return { exists: false, url: null, title: null, source: 'wiktionary' };
      }
    }

    return {
      exists: true,
      url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
      title: word,
      source: 'wiktionary',
    };
  } catch {
    backoffs.wiktionary = Date.now() + BACKOFF_MS;
    return { exists: false, url: null, title: null, source: 'wiktionary' };
  }
}

// --- Wikidata API ---

async function checkWikidata(word) {
  if (Date.now() < backoffs.wikidata) {
    return { exists: false, url: null, title: null, source: 'wikidata' };
  }

  try {
    // Step 1: Search for the entity
    const searchRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(word)}&language=en&limit=1&format=json&origin=*`
    );

    if (searchRes.status === 429 || searchRes.status >= 500) {
      backoffs.wikidata = Date.now() + BACKOFF_MS;
      return { exists: false, url: null, title: null, source: 'wikidata' };
    }

    if (!searchRes.ok) {
      return { exists: false, url: null, title: null, source: 'wikidata' };
    }

    const searchData = await searchRes.json();

    if (!searchData.search || searchData.search.length === 0) {
      return { exists: false, url: null, title: null, source: 'wikidata' };
    }

    const entity = searchData.search[0];

    // Validate: label must match (case-insensitive) and description must exist
    if (!entity.label || entity.label.toLowerCase() !== word.toLowerCase()) {
      return { exists: false, url: null, title: null, source: 'wikidata' };
    }

    if (!entity.description) {
      return { exists: false, url: null, title: null, source: 'wikidata' };
    }

    const entityId = entity.id;

    // Step 2: Check for enwiki sitelink
    const entityRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=sitelinks&format=json&origin=*`
    );

    if (entityRes.status === 429 || entityRes.status >= 500) {
      backoffs.wikidata = Date.now() + BACKOFF_MS;
      // Still have entity info, link to Wikidata page
      return {
        exists: true,
        url: `https://www.wikidata.org/wiki/${entityId}`,
        title: entity.label,
        source: 'wikidata',
      };
    }

    if (!entityRes.ok) {
      // Fallback to Wikidata page
      return {
        exists: true,
        url: `https://www.wikidata.org/wiki/${entityId}`,
        title: entity.label,
        source: 'wikidata',
      };
    }

    const entityData = await entityRes.json();
    const sitelinks = entityData.entities?.[entityId]?.sitelinks;

    if (sitelinks?.enwiki?.title) {
      // Has a Wikipedia article — link there
      const wikiTitle = sitelinks.enwiki.title;
      return {
        exists: true,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
        title: wikiTitle,
        source: 'wikidata',
      };
    }

    // No enwiki sitelink — link to Wikidata page
    return {
      exists: true,
      url: `https://www.wikidata.org/wiki/${entityId}`,
      title: entity.label,
      source: 'wikidata',
    };
  } catch {
    backoffs.wikidata = Date.now() + BACKOFF_MS;
    return { exists: false, url: null, title: null, source: 'wikidata' };
  }
}

// --- GitHub API fallback ---

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
  if (Date.now() < backoffs.github) {
    return { exists: false, url: null, title: null, source: 'github' };
  }

  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(word)}&per_page=1`
    );

    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      backoffs.github = Date.now() + BACKOFF_MS;
      return { exists: false, url: null, title: null, source: 'github' };
    }

    if (!res.ok) {
      return { exists: false, url: null, title: null, source: 'github' };
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const repo = data.items[0];
      if (
        repo.stargazers_count > 100 &&
        repo.name.toLowerCase() === word.toLowerCase()
      ) {
        return { exists: true, url: repo.html_url, title: repo.full_name, source: 'github' };
      }
    }

    return { exists: false, url: null, title: null, source: 'github' };
  } catch {
    backoffs.github = Date.now() + BACKOFF_MS;
    return { exists: false, url: null, title: null, source: 'github' };
  }
}

// --- Resolution chain ---

async function checkAllSources(word) {
  // 1. Wikipedia
  const wikiResult = await checkWikipedia(word);
  if (wikiResult.exists) return wikiResult;

  // 2. Wiktionary
  const wiktResult = await checkWiktionary(word);
  if (wiktResult.exists) return wiktResult;

  // 3. Wikidata
  const wdResult = await checkWikidata(word);
  if (wdResult.exists) return wdResult;

  // 4. GitHub — only for project-like names
  if (looksLikeProjectName(word)) {
    const ghResult = await checkGitHub(word);
    if (ghResult.exists) return ghResult;
  }

  // All sources failed — return negative result
  return { exists: false, url: null, title: null, source: null };
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

export async function enhanceWithSmartLinks(commitBodyElement) {
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
        const result = await checkAllSources(word);
        // Cache the result (positive or negative)
        setCache(word, result);
        if (result.exists && result.url) {
          const cls = result.source === 'github' ? 'wiki-link github-link' : 'wiki-link';
          wrapWordInLink(commitBodyElement, word, result.url, cls);
          continue;
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
          const partResult = await checkAllSources(part);
          setCache(part, partResult);
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
