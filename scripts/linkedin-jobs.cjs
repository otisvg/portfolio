// LinkedIn public (logged-out) job search via headless Chromium.
// Usage: node linkedin-jobs.cjs <out.json> [maxDetails] [previous.json]
//
// Results build up over time: jobs from the previous file (defaults to <out.json>) are kept,
// with the first and last time each was seen, and full ads are only read for jobs that
// haven't been read before. Each job gets a `status`:
//   new      - first seen in this run
//   active   - seen before and still showing in searches
//   gone     - no longer showing in searches (removed, or older than the search window)
//   closed   - the ad says it's no longer accepting applications
//   filtered - the title matched the skip list (see `filterReason`); its ad isn't read
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');

const OUT = process.argv[2] || 'linkedin.json';
const MAX_DETAILS = Number(process.argv[3] || 40);
const PREVIOUS = process.argv[4] || OUT;
const KEEP_DAYS = 30; // drop jobs that haven't shown up in searches for this long

const QUERIES = [
  ['Senior Frontend Engineer', 'Dubai, United Arab Emirates'],
  ['Senior Full Stack Engineer', 'United Arab Emirates'],
  ['React TypeScript', 'United Arab Emirates'],
  ['Next.js', 'United Arab Emirates'],
  ['Full Stack Developer Node.js', 'Dubai, United Arab Emirates'],
  ['Frontend Engineer', 'Abu Dhabi, United Arab Emirates'],
  ['Shopify Developer', 'United Arab Emirates'],
  ['Lead Engineer JavaScript', 'United Arab Emirates'],
  ['Senior Full Stack Engineer TypeScript', 'Worldwide', true],
  ['Senior Frontend Engineer React', 'Worldwide', true],
  ['Senior Full Stack Engineer', 'Europe, Middle East and Africa', true],
];

// Titles to skip. Uses letter boundaries rather than \b so ".NET" and "Data Scientist" match too.
const SKIP = /(?<![a-z])(junior|internship|intern|graduate|python|java|php|golang|go (?:developer|engineer)|android|ios|devops|data scien\w*)(?![a-z])|\.net(?![a-z])/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => sleep(1500 + Math.random() * 2000);

function loadPrevious(file) {
  try {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    const fallback = prev.fetchedAt || new Date().toISOString();
    return (prev.jobs || []).map((j) => ({
      ...j,
      queries: j.queries || (j.query ? [j.query] : []),
      firstSeen: j.firstSeen || fallback,
      lastSeen: j.lastSeen || fallback,
      // Files from before this version have ads but no read date.
      detailsFetchedAt: j.detailsFetchedAt || (j.description ? fallback : undefined),
    }));
  } catch {
    return [];
  }
}

(async () => {
  const runAt = new Date().toISOString();
  const jobs = new Map(loadPrevious(PREVIOUS).map((j) => [j.id, j]));
  const previousCount = jobs.size;
  const errors = [];
  const seenThisRun = new Set();
  let blocked = false;
  let searchComplete = false;
  let details = 0;
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
      proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    });
    // Headless Chromium announces itself as "HeadlessChrome"; present as regular desktop Chrome.
    const major = browser.version().split('.')[0];
    const ctx = await browser.newContext({
      locale: 'en-US',
      userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`,
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const page = await ctx.newPage();

    // 1. Search.
    for (const [keywords, location, remote] of QUERIES) {
      if (blocked) break;
      const query = `${keywords} | ${location}${remote ? ' | remote' : ''}`;
      for (const start of [0, 25]) {
        const u = new URL('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search');
        u.search = new URLSearchParams({ keywords, location, f_TPR: 'r1209600', sortBy: 'DD', start: String(start), ...(remote ? { f_WT: '2' } : {}) });
        try {
          const res = await page.goto(u.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
          const status = res ? res.status() : 0;
          if (status === 429 || status === 999 || /authwall|checkpoint/.test(page.url())) { blocked = true; errors.push(`blocked (${status}) on "${keywords}" / ${location}`); break; }
          if (status >= 400) { errors.push(`HTTP ${status} on "${keywords}" / ${location}`); break; }
          const cards = await page.$$eval('li', (lis) => lis.map((li) => {
            const t = (s) => li.querySelector(s)?.textContent.trim().replace(/\s+/g, ' ') || '';
            const urn = li.querySelector('[data-entity-urn]')?.getAttribute('data-entity-urn') || '';
            return { id: urn.split(':').pop(), title: t('.base-search-card__title'), company: t('.base-search-card__subtitle'),
              location: t('.job-search-card__location'), posted: li.querySelector('time')?.getAttribute('datetime') || '',
              salary: t('.job-search-card__salary-info') };
          }));
          const found = cards.filter((c) => /^\d+$/.test(c.id));
          for (const c of found) {
            seenThisRun.add(c.id);
            const existing = jobs.get(c.id);
            if (existing) {
              Object.assign(existing, c, { lastSeen: runAt });
              if (!existing.queries.includes(query)) existing.queries.push(query);
            } else {
              jobs.set(c.id, { ...c, queries: [query], linkedinUrl: `https://www.linkedin.com/jobs/view/${c.id}/`, firstSeen: runAt, lastSeen: runAt });
            }
          }
          if (found.length < 10) break;
        } catch (e) { errors.push(`${keywords} / ${location}: ${e.message.split('\n')[0]}`); break; }
        await jitter();
      }
    }
    searchComplete = !blocked;

    // 2. Label filtered titles.
    for (const j of jobs.values()) {
      const m = (j.title || '').match(SKIP);
      j.filterReason = m ? `title matches "${m[0]}"` : null;
    }

    // 3. Read full ads, newest first — only jobs seen this run whose ad hasn't been read yet.
    const toRead = [...jobs.values()]
      .filter((j) => seenThisRun.has(j.id) && !j.filterReason && !j.detailsFetchedAt)
      .sort((a, b) => Number(b.id) - Number(a.id));
    for (const j of toRead) {
      if (blocked || details >= MAX_DETAILS) break;
      try {
        const res = await page.goto(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${j.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const status = res ? res.status() : 0;
        if (status === 429 || status === 999) { blocked = true; errors.push(`blocked (${status}) reading job ${j.id}`); break; }
        if (status >= 400) { j.detailError = `HTTP ${status}`; continue; }
        Object.assign(j, await page.evaluate(() => {
          const q = (s) => document.querySelector(s);
          const criteria = {};
          document.querySelectorAll('.description__job-criteria-item').forEach((el) => {
            criteria[el.querySelector('h3')?.textContent.trim()] = el.querySelector('span')?.textContent.trim();
          });
          // The external apply URL sits inside an HTML comment, which textContent skips.
          const applyMatch = (q('#applyUrl')?.innerHTML || '').match(/[?&]url=([^"&]+)/);
          return {
            description: (q('.show-more-less-html__markup')?.innerText || '').trim().slice(0, 8000),
            postedAgo: q('.posted-time-ago__text')?.textContent.trim() || '',
            applicants: q('.num-applicants__caption')?.textContent.trim() || '',
            closed: /no longer accepting/i.test(document.body.innerText),
            applyUrl: applyMatch ? decodeURIComponent(applyMatch[1]) : '',
            criteria,
          };
        }));
        j.detailsFetchedAt = runAt;
        delete j.detailError;
        details++;
      } catch (e) { j.detailError = e.message.split('\n')[0]; }
      await jitter();
    }
  } catch (e) {
    errors.push(`fatal: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});

    // 4. Status labels, pruning and save — runs even if something above failed.
    const cutoff = Date.now() - KEEP_DAYS * 864e5;
    const list = [...jobs.values()]
      .filter((j) => seenThisRun.has(j.id) || Date.parse(j.lastSeen) >= cutoff)
      .sort((a, b) => Number(b.id) - Number(a.id));
    for (const j of list) {
      const unseen = !seenThisRun.has(j.id);
      if (j.filterReason) j.status = 'filtered';
      else if (j.closed) j.status = 'closed';
      // Only call a job gone if every search finished; a blocked run misses jobs that still exist.
      else if (unseen && searchComplete) j.status = 'gone';
      else if (unseen) j.status = j.status === 'gone' ? 'gone' : 'active';
      else j.status = j.firstSeen === runAt ? 'new' : 'active';
      delete j.query; // replaced by `queries`
    }
    const counts = list.reduce((acc, j) => ((acc[j.status] = (acc[j.status] || 0) + 1), acc), {});

    fs.writeFileSync(OUT, JSON.stringify({
      fetchedAt: runAt, blocked, searchComplete, errors,
      count: list.length, seenThisRun: seenThisRun.size, adsRead: details, statusCounts: counts,
      jobs: list,
    }, null, 2));
    console.log(`${seenThisRun.size} jobs seen (${counts.new || 0} new), ${details} ads read, ${list.length} kept (was ${previousCount}), blocked=${blocked}, errors=${errors.length} -> ${OUT}`);
    console.log('  status: ' + (Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'));
    errors.forEach((e) => console.log('  ' + e));
  }
})();
