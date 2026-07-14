# Job Alerts

Automated remote-developer job scraper + email digest + web dashboard.
Runs every 6 hours on GitHub Actions. **$0/month forever.**

## What it does

1. Fetches jobs from **4 free sources**: RemoteOK, Arbeitnow, Remotive, Jobicy
2. Filters by your tech stack (React, Node.js, Next.js, etc.)
3. Excludes senior-level roles
4. Deduplicates identical postings across sites
5. Emails you a digest of **only new** jobs since last run
6. Updates a dashboard you can open anytime

---

## Setup (30 minutes, one time)

### 1. Push to GitHub (5 min)

```bash
cd job-alerts
git init
git add .
git commit -m "initial commit"
gh repo create job-alerts --public --push
# Or: create the repo manually on github.com and push
```

### 2. Get a Gmail app password (5 min)

You need this because Gmail won't let scripts use your regular password.

1. Turn on 2-Step Verification: https://myaccount.google.com/security
2. Create an app password: https://myaccount.google.com/apppasswords
   - App: "Mail", Device: "Other" → name it "Job Alerts"
3. Copy the 16-character password (spaces don't matter)

### 3. Add secrets to GitHub (2 min)

In your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these three:

| Name | Value |
|---|---|
| `GMAIL_USER` | your Gmail address |
| `GMAIL_APP_PASSWORD` | the 16-char app password from step 2 |
| `EMAIL_RECIPIENT` | where the digest goes (can be same as GMAIL_USER) |

### 4. Run it once to verify (2 min)

- Go to **Actions** tab → click "Job Alerts" workflow → click **"Run workflow"**
- Wait ~1 minute
- Check your inbox for the digest
- Check the `data/jobs.json` file that got committed to your repo

That's it. It now runs every 6 hours automatically.

---

## Deploy the dashboard (5 min, optional but recommended)

### Option A: Vercel (recommended)

1. Go to https://vercel.com/new
2. Import your `job-alerts` repo
3. **Root Directory**: `dashboard`
4. **Framework Preset**: "Other"
5. Deploy

Then edit `dashboard/index.html` and change these lines to your info:
```javascript
const GITHUB_USER = 'YOUR_USERNAME';
const GITHUB_REPO = 'job-alerts';
```
Commit + push, Vercel auto-redeploys.

### Option B: GitHub Pages (also free)

1. Repo Settings → Pages
2. Source: "Deploy from branch"
3. Branch: `main` / folder: `/dashboard`
4. Save. URL: `https://YOUR_USERNAME.github.io/job-alerts/`

### Option C: Just open locally

```bash
cd dashboard
python3 -m http.server 8000
# Open http://localhost:8000
```

---

## Customize

### Change your tech stack

Edit `scraper/index.js`, top of file:

```javascript
const KEYWORDS = ['react', 'next.js', 'node.js', 'typescript', ...];
const EXCLUDE_KEYWORDS = ['senior', 'staff', 'lead ', ...];
```

### Change how often it runs

Edit `.github/workflows/job-alerts.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'   # every 6 hours (default)
  - cron: '0 */3 * * *'   # every 3 hours
  - cron: '0 9,15 * * *'  # 9am and 3pm UTC daily
```

### Add more job sources

Add a new fetcher in `scraper/sources.js` following the pattern of the existing ones. Any JSON API works. Then include it in `fetchAllJobs()`.

Good candidates:
- **We Work Remotely** — has RSS you can parse
- **Wellfound (AngelList)** — scraping only
- **Himalayas.app** — has JSON endpoint

---

## Local testing

```bash
cd scraper
cp .env.example .env         # fill in your Gmail info
npm install
npm test                     # dry run - fetches but doesn't save or email
npm start                    # real run - saves + emails if new jobs
```

---

## How it stays free

| Thing | Free tier | You'll use |
|---|---|---|
| GitHub Actions | 2,000 min/month | ~5 min/month |
| Gmail SMTP | 500 emails/day | ~4 emails/day |
| Vercel hosting | Unlimited static | 1 site |
| GitHub raw content | Unlimited | tiny JSON reads |

You are **nowhere near** any limit. This will genuinely never cost you money.

---

## Troubleshooting

**"No email received"** — Check the Actions tab for errors. Most common: Gmail app password copied wrong (must be the 16-char one, not your account password).

**"No new jobs since last run"** — Working as intended. It only emails when something new shows up. Delete `data/seen.json` to reset and get everything on the next run.

**Dashboard shows "No jobs.json found yet"** — You haven't run the scraper yet, or you forgot to update `GITHUB_USER` in `dashboard/index.html`.

**Job sources returning 0** — RemoteOK sometimes rate-limits. The other 3 sources will still work. If one dies permanently, remove its fetch call from `sources.js`.
