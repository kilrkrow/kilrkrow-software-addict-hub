#!/usr/bin/env node
/**
 * Fan-out helper: update one product entry in data/catalog.json from release
 * metadata (used by .github/workflows/release-fanout.yml).
 *
 * Env / args:
 *   SOURCE_REPO   e.g. kilrkrow/sideclip  (or --repo)
 *   TAG           e.g. v0.2.0             (or --tag)
 *   RELEASE_URL   optional
 *   ASSET_URL     optional Windows asset browser_download_url
 *   ASSET_NAME    optional
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'data', 'catalog.json');

function arg(name, envName) {
  const flag = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(flag));
  if (hit) return hit.slice(flag.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env[envName] || '';
}

function humanize(repo) {
  const parts = repo.replaceAll('_', '-').split('-').filter(Boolean);
  return parts
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
}

const sourceRepo = arg('repo', 'SOURCE_REPO');
const tag = arg('tag', 'TAG');
const releaseUrl = arg('release-url', 'RELEASE_URL');
const assetUrl = arg('asset-url', 'ASSET_URL');
const assetName = arg('asset-name', 'ASSET_NAME');

if (!sourceRepo || !tag) {
  console.error('Required: SOURCE_REPO (owner/name) and TAG');
  process.exit(1);
}

const [owner, name] = sourceRepo.split('/');
if (!owner || !name) {
  console.error('SOURCE_REPO must be owner/name');
  process.exit(1);
}

if (!existsSync(catalogPath)) {
  console.error('Missing data/catalog.json');
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const products = catalog.products || [];
let product = products.find((p) => p.slug === name || p.repo === name);

if (!product) {
  product = {
    slug: name,
    repo: name,
    name: humanize(name),
    pitch: '',
    screenshots: ['./screenshots/placeholder.svg', './screenshots/placeholder.svg'],
    youtubeUrl: '',
    repoUrl: `https://github.com/${owner}/${name}`,
  };
  products.push(product);
}

product.version = tag;
product.releaseUrl = releaseUrl || `https://github.com/${owner}/${name}/releases/tag/${tag}`;
product.repoUrl = product.repoUrl || `https://github.com/${owner}/${name}`;
if (assetUrl) {
  product.downloadUrl = assetUrl;
  product.assetName = assetName || assetUrl.split('/').pop();
} else if (!product.downloadUrl) {
  product.downloadUrl = product.releaseUrl;
}

catalog.generatedAt = new Date().toISOString();
catalog.products = products.sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
);

writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Updated ${name} → ${tag}`);
console.log(
  JSON.stringify(
    {
      slug: product.slug,
      version: product.version,
      downloadUrl: product.downloadUrl,
      releaseUrl: product.releaseUrl,
    },
    null,
    2,
  ),
);
