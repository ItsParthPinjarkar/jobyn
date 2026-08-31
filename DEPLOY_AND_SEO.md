# Jobyn — Deployment (Cloudflare Pages) & Google Visibility (Search Console)

> Goal: get Jobyn live on a free, fast host and make it show up in Google search.
> Repo: https://github.com/Ganesh-0509/Jobyn  •  Frontend target URL: https://getjobyn.pages.dev

This is the recreated hosting/SEO playbook (the original notes lived on a branch that was lost).

---

## 0. Why it's not in Google yet
A site only appears in Google once it is (a) **publicly hosted at a stable URL** and (b) **crawled & indexed** by Google. Right now the project isn't on a public production URL that Google has discovered. The two phases below fix exactly that: **Phase A** puts it online; **Phase B** tells Google about it.

The SEO groundwork is already in the code: per-page `<title>`/meta, OpenGraph/Twitter tags, canonical URLs, JSON-LD, `robots.txt`, and `sitemap.xml` — all already pointing at `getjobyn.pages.dev`. A SPA fallback (`frontend/public/_redirects`) is now in place so deep links don't 404.

---

## Architecture & hosting choice (free, verified)
- **Frontend → Cloudflare Pages** — FREE, no credit card, unlimited bandwidth, 500 builds/mo. Best static host.
- **Backend → Render free** (already deployed; 512MB RAM, sleeps after 15 min idle, ~1 min cold start).
  - Upgrade path if ML RAM is exceeded: **Hugging Face Spaces** (Docker, 16GB RAM).
- **Database → Supabase free** (note: pauses when idle — first request after idle may fail/cold-start; just retry).
- Not free anymore in 2026: Railway, Fly.io, Glitch. Vercel Hobby = non-commercial only.

---

## PHASE A — Deploy the frontend to Cloudflare Pages

### A1. Make sure main is pushed
Everything is already on `main` at `github.com/Ganesh-0509/Jobyn`. Commit & push `_redirects` (see end of this doc).

### A2. Create the Pages project
1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize GitHub and select the repo **Ganesh-0509/Jobyn**.
3. **Project name:** `jobyn`  → this gives you **https://getjobyn.pages.dev**.

### A3. Build settings
| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | **None** |
| Root directory | `frontend` |
| Build command | `npm run prebuild && npx tsc && npx vite build` |
| Build output directory | `dist` |

> We use `prebuild && tsc && vite build` (NOT `npm run build`) on purpose — `npm run build` also runs the `postbuild` Puppeteer prerender, which is unreliable on Cloudflare's builders. `prebuild` copies the ONNX/WASM assets into `public/`, which the app needs for privacy-mode ML.

### A4. Environment variables (Pages → Settings → Environment variables → Production)
| Variable | Value |
|---|---|
| `VITE_API_URL` | Your **live Render backend URL** (e.g. `https://campussync-edge-api.onrender.com` — or `https://jobyn-api.onrender.com` if you rename the Render service) |
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `NODE_VERSION` | `20` |
| `PUPPETEER_SKIP_DOWNLOAD` | `1` |

(Optional: `VITE_SENTRY_DSN`.)

### A5. Save & Deploy
Cloudflare builds and publishes to **https://getjobyn.pages.dev**. Watch the build log; first build ~2–4 min.

### A6. Point the backend CORS at the new URL (REQUIRED — else API calls fail)
Render dashboard → backend service → **Environment** → set/append `CORS_ORIGINS`:
```
https://getjobyn.pages.dev,http://localhost:5173
```
Save → backend redeploys. Without this, the browser blocks every API call from getjobyn.pages.dev.

> Note on Render service names: `render.yaml` now defines `jobyn-api` / `jobyn`. Your **existing live services may still be named `campussync-edge-*`** — either rename them in the Render dashboard to match, or keep the old names and just use their real `.onrender.com` URL for `VITE_API_URL` above. Don't blindly re-sync the blueprint or it may create duplicate services.

---

## PHASE B — Make it visible in Google (Search Console)

Do this **after** getjobyn.pages.dev is live.

### B1. Add the property
1. Go to **search.google.com/search-console**.
2. **Add property** → choose **URL prefix** → enter `https://getjobyn.pages.dev`.

### B2. Verify ownership (HTML tag method — easiest for Pages)
1. Search Console gives you a tag like:
   `<meta name="google-site-verification" content="XXXXXXXX" />`
2. Paste it into `frontend/index.html` inside `<head>` (right after the charset/viewport metas).
3. Commit → push → Cloudflare auto-redeploys.
4. Back in Search Console, click **Verify**.

### B3. Submit your sitemap
Search Console → **Sitemaps** → enter `sitemap.xml` → **Submit**.
(It's already live at `https://getjobyn.pages.dev/sitemap.xml`.)

### B4. Request indexing of key pages
Use **URL Inspection** (top bar) → paste each URL → **Request indexing**:
- `https://getjobyn.pages.dev/`
- `https://getjobyn.pages.dev/quick-score`
- `https://getjobyn.pages.dev/docs`
- `https://getjobyn.pages.dev/blog`

### B5. Wait & monitor
Indexing takes **days to a few weeks**. Check progress:
- Google search: `site:getjobyn.pages.dev` (shows what's indexed)
- Search Console **Pages / Coverage** report (shows indexed vs. excluded + reasons)

---

## After it's live — optional polish
- **Custom domain:** buy a domain (e.g. `jobyn.app`) → Cloudflare Pages → Custom domains → add it (free, auto-SSL). Then update `sitemap.xml`, `robots.txt`, canonical/OG URLs, and `CORS_ORIGINS` to the new domain.
- **Email:** the app's `EMAIL_FROM` still uses `onboarding@campussync.dev/.ai` (display name is "Jobyn"). To send from a jobyn address you need a verified domain in Resend.
- **Real backend move (if Render free is too slow):** Hugging Face Spaces (Docker, 16GB).

---

## Quick checklist
- [ ] `frontend/public/_redirects` committed & pushed
- [ ] Cloudflare Pages project `jobyn` created, build = `npm run prebuild && npx tsc && npx vite build`, root = `frontend`, output = `dist`
- [ ] Pages env vars set (VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, NODE_VERSION=20, PUPPETEER_SKIP_DOWNLOAD=1)
- [ ] `https://getjobyn.pages.dev` loads
- [ ] Render `CORS_ORIGINS` includes `https://getjobyn.pages.dev`
- [ ] Search Console property added + verified (meta tag in index.html)
- [ ] `sitemap.xml` submitted
- [ ] Key URLs requested for indexing
