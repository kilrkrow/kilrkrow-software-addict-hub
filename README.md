# Killercrow tools hub

Friendly discovery + install site for **kilrkrow** Windows utilities (spoken: *killercrow*).

## What this is
- Browse short tool cards and download release builds
- One-button **Install selected** flow (elevated PowerShell) preferring **winget**, then **Chocolatey**, then direct GitHub Release download
- Static site ready for GitHub Pages / Cloudflare Pages
- Domains of interest: `killercrow.io`, `killercrow.dev` (appeared unregistered as of 2026-10-06 — not purchased here)

## What this is not
- Demo video clips for each app (separate later task)
- The complex WPF `kilrkrow-launcher` install/detection path (parked as primary UX)

## Local preview
Open `site/index.html` in a browser, or:
```powershell
cd site
python -m http.server 8765
```

## GitHub Pages
Settings → Pages → Source: GitHub Actions. Workflow `.github/workflows/pages.yml` publishes `site/`.

## Catalog
Edit `site/js/catalog.js` to add tools (`wingetId`, `chocoId`, `downloadUrl`).
