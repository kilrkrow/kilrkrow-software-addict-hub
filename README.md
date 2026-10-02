# kilrkrow software-addict discovery hub

A small, public discovery site for **kilrkrow Windows utilities**. Soft neutrals, quiet cards, real GitHub Release download links. No Softpedia automation, no fake download counts, no private repos.

## Preview locally

```bash
npm install
npm run catalog   # needs GITHUB_TOKEN or GH_TOKEN for live GH API
npm run dev       # http://localhost:5173
npm run build && npm run preview
```

`data/catalog.json` is checked in so preview works offline after the first catalog build.

## Catalog rules (aligned with kilrkrow-launcher)

1. List `users/kilrkrow/repos?type=public`
2. Skip private, fork, archived
3. Include repos that have a **non-draft** release with a **Windows asset**
   - `.exe` / `.msi`, or `.zip` whose name suggests Windows (`win-x64`, `windows`, …)
   - Prefer app/gui over cli; never `.nupkg`
4. Unlike the launcher catalog, **`kilrkrow-launcher` itself may appear** here when it has a Windows release
5. Humanize repo names; use GitHub `description` as pitch

Day-one products are whoever currently ships a Windows release zip — re-run `npm run catalog` after new releases.

## Release fan-out

Trigger is **GitHub Release published only** (no periodic reconcile).

1. Utility repo copies [`examples/release-notify.yml`](examples/release-notify.yml) to `.github/workflows/notify-addict-hub.yml`
2. On `release: types: [published]`, it calls the reusable workflow in this repo
3. The hub workflow updates `data/catalog.json` and **opens a PR** (docs/screencap checklist in the body)
4. **Humans merge** — nothing auto-merges

Manual dry-run on this repo:

```bash
gh workflow run "Release fan-out" \
  -f source_repo=kilrkrow/sideclip \
  -f tag=v0.1.0 \
  -f release_url=https://github.com/kilrkrow/sideclip/releases/tag/v0.1.0 \
  -f asset_url=https://github.com/kilrkrow/sideclip/releases/download/v0.1.0/Sideclip-win-x64-v0.1.0.zip \
  -f asset_name=Sideclip-win-x64-v0.1.0.zip
```

Or locally:

```bash
SOURCE_REPO=kilrkrow/sideclip TAG=v0.1.0 \
  RELEASE_URL=https://github.com/kilrkrow/sideclip/releases/tag/v0.1.0 \
  ASSET_URL=https://github.com/kilrkrow/sideclip/releases/download/v0.1.0/Sideclip-win-x64-v0.1.0.zip \
  ASSET_NAME=Sideclip-win-x64-v0.1.0.zip \
  node scripts/update-product-from-release.mjs
```

## Out of scope (v1)

- Softpedia / SnapFiles / WebAttack submissions
- Fox & Dove / monkiesaresm.art demo pipeline
- Domain purchase / production DNS
- Periodic catalog reconcile

## Tone

Simple, humble, elegant — not Craigslist-old, not ostentatious or over-serious.
