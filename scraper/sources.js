// sources.js - Fetches jobs from multiple FREE job APIs
// No API keys required for any of these!

/**
 * Normalize a job into our standard format
 */
function normalizeJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location || 'Remote',
    url: job.url,
    description: job.description || '',
    tags: job.tags || [],
    salary: job.salary || null,
    postedAt: job.postedAt,
    source: job.source,
  };
}

/**
 * RemoteOK - Great source for remote developer jobs
 * https://remoteok.com/api
 */
async function fetchRemoteOK() {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'JobAlerts/1.0' },
    });
    const data = await res.json();
    // First item is metadata, skip it
    const jobs = data.slice(1);

    return jobs.map((j) =>
      normalizeJob({
        id: `remoteok-${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || 'Remote',
        url: j.url || `https://remoteok.com/l/${j.id}`,
        description: (j.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
        tags: j.tags || [],
        salary: j.salary_min && j.salary_max ? `$${j.salary_min}-$${j.salary_max}` : null,
        postedAt: j.date,
        source: 'RemoteOK',
      })
    );
  } catch (err) {
    console.error('RemoteOK error:', err.message);
    return [];
  }
}

/**
 * Arbeitnow - European jobs, includes many remote positions
 * https://www.arbeitnow.com/api/job-board-api
 */
async function fetchArbeitnow() {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    const data = await res.json();

    return (data.data || []).map((j) =>
      normalizeJob({
        id: `arbeitnow-${j.slug}`,
        title: j.title,
        company: j.company_name,
        location: j.location || (j.remote ? 'Remote' : 'On-site'),
        url: j.url,
        description: (j.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
        tags: j.tags || [],
        salary: null,
        postedAt: new Date(j.created_at * 1000).toISOString(),
        source: 'Arbeitnow',
      })
    );
  } catch (err) {
    console.error('Arbeitnow error:', err.message);
    return [];
  }
}

/**
 * Remotive - Good source for remote-only jobs
 * https://remotive.com/api/remote-jobs
 */
async function fetchRemotive() {
  try {
    const res = await fetch(
      'https://remotive.com/api/remote-jobs?category=software-dev&limit=100'
    );
    const data = await res.json();

    return (data.jobs || []).map((j) =>
      normalizeJob({
        id: `remotive-${j.id}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || 'Worldwide',
        url: j.url,
        description: (j.description || '').replace(/<[^>]*>/g, '').slice(0, 300),
        tags: j.tags || [],
        salary: j.salary || null,
        postedAt: j.publication_date,
        source: 'Remotive',
      })
    );
  } catch (err) {
    console.error('Remotive error:', err.message);
    return [];
  }
}

/**
 * Jobicy - Growing remote jobs board
 * https://jobicy.com/api/v2/remote-jobs
 */
async function fetchJobicy() {
  try {
    const res = await fetch(
      'https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev'
    );
    const data = await res.json();

    return (data.jobs || []).map((j) =>
      normalizeJob({
        id: `jobicy-${j.id}`,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || 'Remote',
        url: j.url,
        description: (j.jobExcerpt || '').replace(/<[^>]*>/g, '').slice(0, 300),
        tags: j.jobIndustry ? [j.jobIndustry].flat() : [],
        salary: j.annualSalaryMin && j.annualSalaryMax
          ? `${j.salaryCurrency || '$'}${j.annualSalaryMin}-${j.annualSalaryMax}`
          : null,
        postedAt: j.pubDate,
        source: 'Jobicy',
      })
    );
  } catch (err) {
    console.error('Jobicy error:', err.message);
    return [];
  }
}

/**
 * Fetch from all sources in parallel
 */
export async function fetchAllJobs() {
  console.log('Fetching jobs from all sources...');
  const results = await Promise.all([
    fetchRemoteOK(),
    fetchArbeitnow(),
    fetchRemotive(),
    fetchJobicy(),
  ]);

  const all = results.flat();
  console.log(`  RemoteOK: ${results[0].length}`);
  console.log(`  Arbeitnow: ${results[1].length}`);
  console.log(`  Remotive: ${results[2].length}`);
  console.log(`  Jobicy: ${results[3].length}`);
  console.log(`  Total: ${all.length}`);

  return all;
}

/**
 * Filter jobs by keywords (case-insensitive)
 * Returns jobs where the title, description, or tags match ANY of the keywords
 */
export function filterByKeywords(jobs, keywords) {
  const kw = keywords.map((k) => k.toLowerCase());

  return jobs.filter((job) => {
    const haystack = [
      job.title,
      job.description,
      ...(job.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    return kw.some((k) => haystack.includes(k));
  });
}

/**
 * Deduplicate jobs by (title + company) since same job posted to multiple boards
 */
export function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${(job.title || '').toLowerCase().trim()}::${(job.company || '').toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
