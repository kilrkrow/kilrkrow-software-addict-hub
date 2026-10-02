# Slice critic (v1 scaffold + fan-out)

## Verdict: **PASS** (self-check before human review)

| Check | Result |
|-------|--------|
| Public Windows utilities with real release assets only | PASS — audio-mixer, netpulse, sideclip, voltdesk, win-service-buddy |
| Private repos excluded | PASS — `type=public` + skip private/fork/archived |
| ollama-mgr / kilrkrow-launcher without Windows assets omitted | PASS |
| Obsidian plugins / flowscript / lab-dashboard / netscript omitted | PASS |
| Softpedia / SnapFiles / WebAttack automation absent | PASS |
| Fox & Dove / monkiesaresm.art untouched | PASS |
| No fake download counts / badges | PASS |
| Tone: simple, humble, elegant | PASS — soft neutrals, quiet cards, IBM Plex |
| Release-published fan-out opens PR only (no merge) | PASS — create-pull-request + checklist |
| YouTube stubs empty | PASS |

## Notes

- Catalog heuristic mirrors launcher scoring for named Windows zips/exes (no remote zip-entry inspect). Day-one assets match.
- voltdesk included via older release asset `VoltDesk.exe` (newer tags had empty assets[]; script walks recent non-draft releases like the launcher).
- Example utility wiring: `examples/release-notify.yml` + optional sideclip PR.
