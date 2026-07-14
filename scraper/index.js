// index.js - Main entry point
// Fetches jobs, filters by keywords, dedupes, saves to JSON, emails digest

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchAllJobs, filterByKeywords, dedupeJobs } from './sources.js';
import { sendDigestEmail } from './emailer.js';

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Edit these keywords to match what YOU want
const KEYWORDS = [
  'react',
  'next.js',
  'nextjs',
  'node.js',
  'nodejs',
  'javascript',
  'typescript',
  'express',
  'mern',
  'full stack',
  'fullstack',
  'frontend',
  'backend',
];

// Exclude these (senior roles you can't apply to yet)
const EXCLUDE_KEYWORDS = ['senior', 'staff', 'principal', 'lead ', 'director'];

const DATA_DIR = path.join(process.cwd(), '..', 'data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const SEEN_FILE = path.join(DATA_DIR, 'seen.json');

// ─── HELPERS ───────────────────────────────────────────────────────────────
async function readJSON(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJSON(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function excludeSeniorRoles(jobs) {
  return jobs.filter((j) => {
    const title = (j.title || '').toLowerCase();
    return !EXCLUDE_KEYWORDS.some((kw) => title.includes(kw));
  });
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Job Alerts running${isDryRun ? ' (dry run)' : ''}...`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // 1. Fetch from all sources
  const allJobs = await fetchAllJobs();

  // 2. Filter by keywords
  const matched = filterByKeywords(allJobs, KEYWORDS);
  console.log(`\nMatched keywords: ${matched.length}`);

  // 3. Remove senior roles
  const junior = excludeSeniorRoles(matched);
  console.log(`After excluding senior roles: ${junior.length}`);

  // 4. Dedupe
  const deduped = dedupeJobs(junior);
  console.log(`After dedupe: ${deduped.length}`);

  // 5. Load previously seen jobs to find only NEW ones
  const seen = await readJSON(SEEN_FILE, {});
  const newJobs = deduped.filter((j) => !seen[j.id]);
  console.log(`New (unseen): ${newJobs.length}\n`);

  // 6. Mark all current jobs as seen (with timestamp so we can expire old ones)
  const now = Date.now();
  const updatedSeen = { ...seen };
  for (const j of deduped) {
    updatedSeen[j.id] = now;
  }
  // Prune anything older than 30 days
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  for (const [id, ts] of Object.entries(updatedSeen)) {
    if (ts < thirtyDaysAgo) delete updatedSeen[id];
  }

  // 7. Save the full deduped list for the dashboard + seen ledger
  if (!isDryRun) {
    // Sort newest first
    const sorted = [...deduped].sort(
      (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
    );

    await writeJSON(JOBS_FILE, {
      updatedAt: new Date().toISOString(),
      total: sorted.length,
      newSinceLastRun: newJobs.length,
      jobs: sorted,
    });
    await writeJSON(SEEN_FILE, updatedSeen);
    console.log(`Saved ${sorted.length} jobs to ${JOBS_FILE}`);
  }

  // 8. Email digest (only if there are NEW jobs)
  if (newJobs.length > 0 && !isDryRun) {
    // Top 20 newest to keep the email readable
    const topNew = newJobs
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
      .slice(0, 20);

    await sendDigestEmail(topNew, {
      gmailUser: process.env.GMAIL_USER,
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
      recipient: process.env.EMAIL_RECIPIENT,
    });
  } else if (newJobs.length === 0) {
    console.log('No new jobs since last run - skipping email');
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
