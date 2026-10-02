#!/usr/bin/env node
/**
 * Build data/catalog.json from public kilrkrow repos that ship a Windows
 * release asset. Rules align with kilrkrow-launcher GitHubCatalogClient:
 *   - users/kilrkrow/repos?type=public
 *   - skip private, fork, archived
 *   - include repos with a non-draft release that has a Windows asset
 *     (.exe / .msi, or .zip with win-x64|windows|win64|win-x86 in the name;
 *      prefer app over cli; never .nupkg; never source zipballs)
 *   - unlike the launcher, SelfRepo (kilrkrow-launcher) MAY appear here
 *     when it has a Windows release
 *
 * Usage: GITHUB_TOKEN=... node scripts/build-catalog.mjs
 * Offline: uses existing data/catalog.json if API fails and --strict is unset.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'data', 'catalog.json');
const OWNER = 'kilrkrow';
const API = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const strict = process.argv.includes('--strict');

function humanize(repo) {
  if (!repo) return repo;
  const parts = repo.replaceAll('_', '-').split('-').filter(Boolean);
  return parts
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
}

function isDirectWindowsBinary(name) {
  const n = (name || '').trim().toLowerCase();
  return n.endsWith('.exe') || n.endsWith('.msi');
}

function isZipCandidate(name) {
  const n = (name || '').trim().toLowerCase();
  if (!n.endsWith('.zip')) return false;
  if (n.endsWith('.nupkg')) return false;
  return true;
}

/** Heuristic aligned with WindowsAssetFilter.Score (no zip-entry inspect). */
function scoreAsset(name) {
  const n = name.toLowerCase();
  let score = 0;
  if (n.endsWith('.msi')) score += 30;
  else if (n.endsWith('.exe')) score += 24;
  else if (n.endsWith('.zip')) score += 16;
  else return -Infinity;

  if (n.includes('setup') || n.includes('install')) score += 6;
  if (n.includes('app') || n.includes('gui') || n.includes('desktop')) score += 5;
  if (
    n.includes('win-x64') ||
    n.includes('win64') ||
    n.includes('windows') ||
    n.includes('win-x86')
  ) {
    score += 4;
  } else if (n.endsWith('.zip') && !n.endsWith('.exe') && !n.endsWith('.msi')) {
    // Zip without Windows token — skip (avoid source archives).
    return -Infinity;
  }
  if (n.includes('cli') || n.includes('console')) score -= 8;
  if (n.includes('source') || n.includes('src') || n.includes('symbols')) score -= 12;
  return score;
}

function pickWindowsAsset(assets) {
  const scored = [];
  for (const asset of assets || []) {
    const name = asset.name || '';
    if (isDirectWindowsBinary(name) || isZipCandidate(name)) {
      const s = scoreAsset(name);
      if (s > -Infinity) scored.push({ score: s, asset });
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score || a.asset.name.localeCompare(b.asset.name));
  return scored[0].asset;
}

async function gh(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kilrkrow-software-addict-hub-catalog',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function listPublicRepos() {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(
      `/users/${OWNER}/repos?type=public&per_page=100&page=${page}&sort=full_name`,
    );
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

async function pickNewestWindowsRelease(repoName) {
  const releases = await gh(`/repos/${OWNER}/${repoName}/releases?per_page=30`);
  for (const release of releases) {
    if (release.draft) continue;
    const pick = pickWindowsAsset(release.assets);
    if (pick) return { release, asset: pick };
  }
  return null;
}

function productFrom(repo, hit) {
  const slug = repo.name;
  const existingShots = preserveScreenshots(slug);
  return {
    slug,
    repo: repo.name,
    name: humanize(repo.name),
    pitch: (repo.description || '').trim() || defaultPitch(repo.name),
    version: hit.release.tag_name,
    releaseUrl: hit.release.html_url || repo.html_url,
    repoUrl: repo.html_url,
    downloadUrl: hit.asset.browser_download_url,
    assetName: hit.asset.name,
    assetSize: hit.asset.size,
    screenshots: existingShots,
    youtubeUrl: '',
  };
}

function defaultPitch(name) {
  const map = {
    'audio-mixer': 'A small Windows mixer for quick volume control.',
  };
  return map[name] || 'A kilrkrow Windows utility.';
}

function preserveScreenshots(slug) {
  try {
    if (!existsSync(outPath)) {
      return ['./screenshots/placeholder.svg', './screenshots/placeholder.svg'];
    }
    const prev = JSON.parse(readFileSync(outPath, 'utf8'));
    const found = (prev.products || []).find((p) => p.slug === slug);
    if (found?.screenshots?.length) return found.screenshots;
  } catch {
    /* ignore */
  }
  return ['./screenshots/placeholder.svg', './screenshots/placeholder.svg'];
}

async function main() {
  console.log(`Building catalog for ${OWNER}…`);
  const repos = await listPublicRepos();
  const products = [];

  for (const repo of repos) {
    if (repo.private || repo.fork || repo.archived) continue;
    try {
      const hit = await pickNewestWindowsRelease(repo.name);
      if (!hit) continue;
      products.push(productFrom(repo, hit));
      console.log(`  + ${repo.name} @ ${hit.release.tag_name} → ${hit.asset.name}`);
    } catch (err) {
      console.warn(`  ! ${repo.name}: ${err.message}`);
    }
  }

  products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const catalog = {
    generatedAt: new Date().toISOString(),
    owner: OWNER,
    source: 'github-releases-windows-assets',
    note: 'Public Windows utilities only. No private repos. No fake download counts.',
    products,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${products.length} products → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  if (strict) process.exit(1);
  if (existsSync(outPath)) {
    console.warn('Keeping existing catalog.json (non-strict).');
    process.exit(0);
  }
  process.exit(1);
});
