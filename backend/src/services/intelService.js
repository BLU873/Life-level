const { createHash } = require('crypto');

/**
 * Intel // Briefing — server-mediated aggregation of public, keyless content
 * sources. No secrets, no database, no Prisma models: the backend only relays,
 * normalizes and short-caches external content for the authenticated client.
 *
 * Source strategy:
 *  - dev.to public API  (CODING)   — direct JSON, no key.
 *  - RSS feeds via the public rss2json relay (TECH / SPORTS / FITNESS / GAMING).
 *
 * Every failure is isolated per category so one offline source never blanks
 * the whole page.
 */

const CATEGORIES = ['TECH', 'CODING', 'SPORTS', 'FITNESS', 'GAMING'];

const INTEL_SOURCES = {
  TECH: [{ type: 'rss', caption: 'BBC News', rssUrl: 'https://feeds.bbci.co.uk/news/technology/rss.xml' }],
  CODING: [{ type: 'devto', caption: 'dev.to', tag: 'programming' }],
  SPORTS: [{ type: 'rss', caption: 'BBC Sport', rssUrl: 'https://feeds.bbci.co.uk/sport/rss.xml' }],
  FITNESS: [{ type: 'rss', caption: "Runner's World", rssUrl: 'https://www.runnersworld.com/rss/all/' }],
  GAMING: [{ type: 'rss', caption: 'Rock Paper Shotgun', rssUrl: 'https://www.rockpapershotgun.com/feed' }],
};

const CACHE_TTL_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const RSS_ITEMS = 10;
const DESCRIPTION_LIMIT = 200;

const cache = new Map();

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LIFELEVEL-Intel/1.0 (+frontend) ' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stripHtml(input) {
  if (!input) return '';
  return String(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = DESCRIPTION_LIMIT) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

function safeIso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeRssDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeImage(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {
    /* ignore malformed image URLs */
  }
  return null;
}

async function fetchRssItems(source) {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rssUrl)}`;
  const json = await fetchJson(apiUrl);
  if (!json || json.status !== 'ok') {
    throw new Error(`rss2json reported status: ${json ? json.status : 'empty'}`);
  }
  return (Array.isArray(json.items) ? json.items : []).map((item) => ({
    title: cleanString(item.title),
    description: truncate(stripHtml(item.description || '')),
    image: normalizeImage(item.thumbnail || (item.enclosure && item.enclosure.link) || null),
    url: cleanString(item.link),
    publishedAt: normalizeRssDate(item.pubDate),
    rawId: cleanString(item.guid) || null,
  }));
}

async function fetchDevToItems(source) {
  const apiUrl = `https://dev.to/api/articles?per_page=${RSS_ITEMS}&tag=${encodeURIComponent(source.tag)}`;
  const json = await fetchJson(apiUrl);
  const arr = Array.isArray(json) ? json : [];
  return arr.map((item) => ({
    title: cleanString(item.title),
    description: truncate(cleanString(item.description) || `Published on dev.to by ${item.user?.username || 'a developer'}.`),
    image: normalizeImage(item.cover_image || item.social_image || null),
    url: cleanString(item.url),
    publishedAt: safeIso(item.published_at),
    rawId: item.id ? `devto-${item.id}` : null,
  }));
}

function buildItem(raw, category, source) {
  if (!raw.title || !raw.url) return null;
  const hash = createHash('sha256').update(String(raw.rawId || raw.url)).digest('hex').slice(0, 12);
  return {
    id: `${category}:${hash}`,
    title: raw.title,
    description: raw.description || '',
    image: raw.image,
    source: source.caption,
    url: raw.url,
    publishedAt: raw.publishedAt,
    category,
  };
}

async function fetchCategoryFresh(category, fetchedAt) {
  const sources = INTEL_SOURCES[category] || [];
  let failed = false;
  const items = [];

  for (const source of sources) {
    try {
      const raw = source.type === 'devto' ? await fetchDevToItems(source) : await fetchRssItems(source);
      for (const r of raw) {
        const built = buildItem(r, category, source);
        if (built) items.push(built);
      }
    } catch {
      failed = true;
    }
  }

  return { category, fetchedAt, failed, items };
}

/**
 * GET intel for a single category or all categories.
 *   category: one of CATEGORIES or null for the full briefing
 *   limit: max items to return (default 40)
 *   force: bypass the short in-memory cache for a manual refresh
 */
async function getIntel({ category = null, limit = 40, force = false } = {}) {
  const now = Date.now();
  const cats = category && CATEGORIES.includes(category) ? [category] : CATEGORIES;

  const results = await Promise.all(
    cats.map(async (cat) => {
      let cached = cache.get(cat);
      if (force || !cached || now - cached.fetchedAt > CACHE_TTL_MS) {
        cached = await fetchCategoryFresh(cat, now);
        cache.set(cat, cached);
      }
      return cached;
    })
  );

  const failedCategories = results.filter((r) => r.failed).map((r) => r.category);
  const items = results.flatMap((r) => r.items);

  const effectiveLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 50)) : 40;

  const sorted = [
    ...items.filter((i) => i.publishedAt).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    ...items.filter((i) => !i.publishedAt),
  ].slice(0, effectiveLimit);

  return {
    items: sorted,
    failedCategories,
    fetchedAt: new Date(now).toISOString(),
  };
}

module.exports = { getIntel, CATEGORIES, INTEL_SOURCES };