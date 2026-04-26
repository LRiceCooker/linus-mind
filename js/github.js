// github.js — GitHub API calls + caching

const API_BASE = 'https://api.github.com';
const REPOS_CACHE_KEY = 'linus-mind:repos';
const REPOS_TTL = 600_000; // 10 minutes
const commitCache = new Map();

// Rate-limit state (updated on every non-304 response)
let rateLimit = { remaining: null, resetAt: null };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatStars(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(count);
}

function parseCommitMessage(message) {
  const lines = message.split('\n');
  const title = lines[0];
  // Body starts after the first blank line
  let bodyStart = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      bodyStart = i + 1;
      break;
    }
  }
  const body = bodyStart > 0 ? lines.slice(bodyStart).join('\n').trimEnd() : '';
  return { title, body };
}

function parseLinkHeader(header) {
  if (!header) return {};
  const links = {};
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  }
  return links;
}

function updateRateLimit(res) {
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');
  if (remaining !== null) {
    rateLimit.remaining = parseInt(remaining, 10);
  }
  if (reset !== null) {
    rateLimit.resetAt = parseInt(reset, 10) * 1000; // convert to ms
  }
}

export function getRateLimitInfo() {
  return { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt };
}

function processReposData(data) {
  return data
    .filter(r => !r.fork)
    .map(r => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: formatStars(r.stargazers_count),
    }))
    .sort((a, b) => {
      const toNum = s => {
        if (s.endsWith('k')) return parseFloat(s) * 1000;
        return parseInt(s, 10);
      };
      return toNum(b.stars) - toNum(a.stars);
    });
}

export async function fetchRepos() {
  // Load cache from sessionStorage
  let cached = null;
  try {
    const raw = sessionStorage.getItem(REPOS_CACHE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch { /* ignore corrupt cache */ }

  // If cached and within TTL, return without fetching
  if (cached?.data && cached.timestamp && Date.now() - cached.timestamp < REPOS_TTL) {
    return cached.data;
  }

  // If rate limit exhausted, return cached if available
  if (rateLimit.remaining === 0) {
    if (cached?.data) return cached.data;
    throw { status: 403 };
  }

  // Build conditional request headers
  const headers = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetch(
    `${API_BASE}/users/torvalds/repos?type=owner&sort=stars&direction=desc&per_page=100`,
    { headers }
  );

  // 304 Not Modified — data unchanged, refresh timestamp
  if (res.status === 304) {
    cached.timestamp = Date.now();
    sessionStorage.setItem(REPOS_CACHE_KEY, JSON.stringify(cached));
    return cached.data;
  }

  if (!res.ok) throw { status: res.status };

  updateRateLimit(res);

  const data = await res.json();
  const repos = processReposData(data);
  const etag = res.headers.get('ETag');

  sessionStorage.setItem(REPOS_CACHE_KEY, JSON.stringify({
    data: repos,
    etag: etag || null,
    timestamp: Date.now(),
  }));

  return repos;
}

export async function fetchCommits(repo, page = 1) {
  const cacheKey = `${repo}:${page}`;
  const cached = commitCache.get(cacheKey);

  // Commits have no TTL — if cached, return immediately
  if (cached?.data) return cached.data;

  // If rate limit exhausted, return cached if available
  if (rateLimit.remaining === 0) {
    if (cached?.data) return cached.data;
    throw { status: 403 };
  }

  // Build conditional request headers
  const headers = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetch(
    `${API_BASE}/repos/torvalds/${repo}/commits?per_page=30&page=${page}`,
    { headers }
  );

  // 304 Not Modified — return cached data
  if (res.status === 304) {
    return cached.data;
  }

  if (!res.ok) throw { status: res.status };

  updateRateLimit(res);

  const data = await res.json();
  const links = parseLinkHeader(res.headers.get('Link'));
  const hasMore = !!links.next;

  const commits = data.map(c => {
    const { title, body } = parseCommitMessage(c.commit.message);
    return {
      sha: c.sha.slice(0, 7),
      title,
      body,
      date: c.commit.author.date,
      formattedDate: formatDate(c.commit.author.date),
    };
  });

  const result = { commits, hasMore };
  const etag = res.headers.get('ETag');
  commitCache.set(cacheKey, { data: result, etag: etag || null });
  return result;
}
