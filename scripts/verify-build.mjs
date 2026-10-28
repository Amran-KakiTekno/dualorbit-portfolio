#!/usr/bin/env node
/**
 * Build output check for the portfolio.
 *
 * Asserts that the build produced exactly one HTML document (a single-page
 * site) and that the JavaScript and CSS assets it references are non-empty.
 *
 * Run: node scripts/verify-build.mjs
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

if (!existsSync(distDir)) {
  console.error('VERIFY_FAILED reason=missing-dist path=dist');
  process.exit(1);
}

function walk(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(fullPath));
    } else {
      found.push(fullPath);
    }
  }
  return found;
}

const files = walk(distDir).map((path) => ({ path, size: statSync(path).size }));
const htmlFiles = files.filter((file) => file.path.endsWith('.html'));

if (htmlFiles.length !== 1) {
  console.error(`VERIFY_FAILED reason=html-count count=${htmlFiles.length}`);
  for (const file of htmlFiles) {
    console.error(` - ${relative(distDir, file.path)}`);
  }
  process.exit(1);
}

const indexPath = htmlFiles[0].path;
if (!indexPath.endsWith(`${sep}index.html`)) {
  console.error(`VERIFY_FAILED reason=unexpected-html file=${relative(distDir, indexPath)}`);
  process.exit(1);
}

if (indexPath.size === 0) {
  console.error('VERIFY_FAILED reason=empty-html');
  process.exit(1);
}

const jsFiles = files.filter((file) => file.path.endsWith('.js'));
const cssFiles = files.filter((file) => file.path.endsWith('.css'));

if (jsFiles.length === 0) {
  console.error('VERIFY_FAILED reason=no-js-asset');
  process.exit(1);
}
if (cssFiles.length === 0) {
  console.error('VERIFY_FAILED reason=no-css-asset');
  process.exit(1);
}

for (const file of [...jsFiles, ...cssFiles]) {
  if (file.size === 0) {
    console.error(`VERIFY_FAILED reason=empty-asset file=${relative(distDir, file.path)}`);
    process.exit(1);
  }
}

console.log(
  `BUILD_OK html=1 js=${jsFiles.length} css=${cssFiles.length} bytes=${files.reduce(
    (total, file) => total + file.size,
    0,
  )}`,
);
console.log('VERIFY_OK dualorbit-portfolio');
