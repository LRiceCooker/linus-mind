// github.js — GitHub API calls + caching

const API_BASE = 'https://api.github.com';
const REPOS_CACHE_KEY = 'linus-mind:repos';
const commitCache = new Map();

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

export async function fetchRepos() {
  // Check sessionStorage cache first
  const cached = sessionStorage.getItem(REPOS_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  const res = await fetch(
    `${API_BASE}/users/torvalds/repos?type=owner&sort=stars&direction=desc&per_page=100`
  );
  if (!res.ok) throw { status: res.status };

  const data = await res.json();
  const repos = data
    .filter(r => !r.fork)
    .map(r => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: formatStars(r.stargazers_count),
    }))
    .sort((a, b) => {
      // Parse stars back to number for sorting
      const toNum = s => {
        if (s.endsWith('k')) return parseFloat(s) * 1000;
        return parseInt(s, 10);
      };
      return toNum(b.stars) - toNum(a.stars);
    });

  sessionStorage.setItem(REPOS_CACHE_KEY, JSON.stringify(repos));
  return repos;
}

export async function fetchCommits(repo, page = 1) {
  const cacheKey = `${repo}:${page}`;
  const cached = commitCache.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${API_BASE}/repos/torvalds/${repo}/commits?per_page=30&page=${page}`
  );
  if (!res.ok) throw { status: res.status };

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
  commitCache.set(cacheKey, result);
  return result;
}
