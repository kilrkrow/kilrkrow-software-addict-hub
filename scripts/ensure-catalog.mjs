#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = join(root, 'data', 'catalog.json');

if (existsSync(catalog)) {
  process.exit(0);
}

console.log('data/catalog.json missing — running build-catalog.mjs');
const r = spawnSync(process.execPath, [join(root, 'scripts', 'build-catalog.mjs')], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
