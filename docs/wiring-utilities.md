# Wiring a utility repo to the hub

## One-time per utility

1. Ensure the hub’s callable workflow is on `main`:
   `.github/workflows/release-fanout-callable.yml`
2. Add [`examples/release-notify.yml`](../examples/release-notify.yml) as
   `.github/workflows/notify-addict-hub.yml` in the utility (open a PR — do not auto-merge).
3. Publish a GitHub Release with a Windows zip asset (`*-win-x64-*.zip` preferred).
4. Confirm a fan-out PR appears on `kilrkrow/kilrkrow-software-addict-hub`.

## Multi-asset releases

`github.event.release.assets[0]` may not be the GUI zip. Prefer a thin job that
picks the highest-scoring Windows asset (same heuristics as `scripts/build-catalog.mjs`)
before calling the reusable workflow, or set `asset_url` / `asset_name` explicitly.

## Permissions note

Same-org `workflow_call` usually works with the default `GITHUB_TOKEN` on the
**callee** (hub) to open the PR. If GitHub blocks cross-repo reusable workflows,
fall back to `repository_dispatch` with event type `kilrkrow-release-fanout` and
payload `{ source_repo, tag, release_url, asset_url, asset_name }` (see
`release-fanout.yml`).
