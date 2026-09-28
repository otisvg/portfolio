// LinkedIn public (logged-out) job search via headless Chromium.
// Usage: node linkedin-jobs.cjs <out.json> [maxDetails]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');

const OUT = process.argv[2] || 'linkedin.json';
const MAX_DETAILS = Number(process.argv[3] || 40);
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => sleep(1500 + Math.random() * 2000);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  });
  const ctx = await browser.newContext({ locale: 'en-US' });
  const page = await ctx.newPage();
  const jobs = new Map();
  const errors = [];
  let blocked = false;

  for (const [keywords, location, remote] of QUERIES) {
    for (const start of [0, 25]) {
      if (blocked) break;
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
        for (const c of found) if (!jobs.has(c.id)) jobs.set(c.id, { ...c, query: `${keywords} | ${location}${remote ? ' | remote' : ''}`, linkedinUrl: `https://www.linkedin.com/jobs/view/${c.id}/` });
        if (found.length < 10) break;
      } catch (e) { errors.push(`${keywords} / ${location}: ${e.message.split('\n')[0]}`); break; }
      await jitter();
    }
  }

  // Newest first (higher id = newer), then read full ads.
  const list = [...jobs.values()].sort((a, b) => Number(b.id) - Number(a.id));
  const skip = /\b(junior|intern|internship|graduate|python|java\b|\.net|php|golang|android|ios|data scien|devops)\b/i;
  let details = 0;
  for (const j of list) {
    if (blocked || details >= MAX_DETAILS) break;
    if (skip.test(j.title)) continue;
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
        return {
          description: (q('.show-more-less-html__markup')?.innerText || '').trim().slice(0, 8000),
          postedAgo: q('.posted-time-ago__text')?.textContent.trim() || '',
          applicants: q('.num-applicants__caption')?.textContent.trim() || '',
          closed: /no longer accepting/i.test(document.body.innerText),
          applyUrl: q('#applyUrl')?.textContent.match(/url=([^"&]+)/)?.[1] ? decodeURIComponent(q('#applyUrl').textContent.match(/url=([^"&]+)/)[1]) : '',
          criteria,
        };
      }));
      details++;
    } catch (e) { j.detailError = e.message.split('\n')[0]; }
    await jitter();
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), blocked, errors, count: list.length, jobs: list }, null, 2));
  console.log(`${list.length} jobs, ${details} ads read, blocked=${blocked}, errors=${errors.length} -> ${OUT}`);
  errors.forEach((e) => console.log('  ' + e));
})();
