# Killercrow tools hub

Friendly discovery + install site for **kilrkrow** Windows utilities (spoken: **killercrow**).

Live (after Pages enabled): https://kilrkrow.github.io/kilrkrow-software-addict-hub/

## What this is
- Browse short tool cards and download release builds
- One-button **Install selected** flow (elevated PowerShell) preferring **winget**, then **Chocolatey**, then direct GitHub Release download
- Static site ready for GitHub Pages / Cloudflare Pages
- Domains of interest: `killercrow.io`, `killercrow.dev` (appeared **NXDOMAIN / unregistered** as of 2026-10-06 — **not purchased**)

## What this is not
- Demo video clips for each app (separate later task)
- The complex WPF [`kilrkrow-launcher`](https://github.com/kilrkrow/kilrkrow-launcher) install/detection path (parked as primary UX)

## Tools listed

| Tool | Tag | Asset | winget | choco |
|------|-----|-------|--------|-------|
| Sideclip | v0.1.0 | `Sideclip-win-x64-v0.1.0.zip` | — | — |
| NetPulse | v0.1.0 | `NetPulse-win-x64-v0.1.0.zip` | — | — |
| VoltDesk | v1.0.2 | `VoltDesk.exe` | — | `voltdesk` (community) |
| Win Service Buddy | v0.2.0 | `wsbuddy-app-win-x64-v0.2.0.zip` | — | nupkg on release only |
| KilrKrow Mixer | v0.1.1 | `AudioMixer-win-x64-v0.1.1.zip` | — | — |

**Omitted for now:** `ollama-mgr` (no Releases), `kilrkrow-launcher` (deprecated primary path). VoltDesk **v1.1.0** latest tag has empty `assets[]` — hub points at **v1.0.2**.

### Still need winget / choco package IDs
- **winget:** all five tools (none published yet)
- **choco:** Sideclip, NetPulse, Mixer, Win Service Buddy (VoltDesk already set to `voltdesk`)

## Install (admin)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
irm https://kilrkrow.github.io/kilrkrow-software-addict-hub/install.ps1 | iex
```

Or open the site, check boxes, **Install selected** → copy/download the generated script.

## Local preview
```powershell
cd site
python -m http.server 8765
```

## GitHub Pages
Settings → Pages → Source: **GitHub Actions**. Workflow `.github/workflows/pages.yml` publishes `site/`.

## Cloudflare Pages
Connect this repo; no build command; output directory `site` (or deploy root if you flatten later).

## Catalog
Edit `site/js/catalog.js` (`wingetId`, `chocoId`, `downloadUrl`). Keep `site/install.ps1` in sync for the all-tools path.
