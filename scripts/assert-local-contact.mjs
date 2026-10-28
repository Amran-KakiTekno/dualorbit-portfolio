#!/usr/bin/env node
/**
 * Assert, against the local D1 state written by `wrangler pages dev`, that the
 * contact integration produced exactly one row — the browser QA submission —
 * with the expected fixed values and no extra columns.
 *
 * Prints `CONTACT_VERIFY_OK localRows=1` on success. Local only: every Wrangler
 * call passes `--local`.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const wranglerManifestPath = require.resolve('wrangler/package.json');
const wranglerManifest = require('wrangler/package.json');
const wranglerBin = path.join(path.dirname(wranglerManifestPath), wranglerManifest.bin.wrangler);

const DATABASE = 'dualorbit-contacts';
const EXPECTED_EMAIL = 'local-qa@dualorbit.invalid';
const EXPECTED_NAME = 'Local QA';
const EXPECTED_MESSAGE = 'Synthetic local integration enquiry.';
const EXPECTED_COLUMNS = ['id', 'name', 'email', 'message', 'created_at'];

function fail(message) {
  console.error(`CONTACT_VERIFY_FAILED ${message}`);
  process.exit(1);
}

function runLocalQuery(sql) {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [wranglerBin, 'd1', 'execute', DATABASE, '--local', '--json', '--command', sql],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (error) {
    const detail = (error.stderr || error.message || '').toString().trim();
    fail(`local-query-error ${detail.split('\n').slice(-3).join(' | ')}`);
  }

  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  if (start === -1 || end < start) {
    fail(`local-query-output-not-json ${stdout.trim().slice(0, 200)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout.slice(start, end + 1));
  } catch {
    fail(`local-query-output-not-json ${stdout.trim().slice(0, 200)}`);
  }

  const batch = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!batch || !Array.isArray(batch.results)) {
    fail('local-query-output-missing-results');
  }

  return batch.results;
}

const totalRows = runLocalQuery('SELECT COUNT(*) AS total FROM contact_submissions;');
if (totalRows.length !== 1 || Number(totalRows[0].total) !== 1) {
  fail(`expected-total-rows-1 got=${JSON.stringify(totalRows)}`);
}

const rows = runLocalQuery(
  `SELECT * FROM contact_submissions WHERE email = '${EXPECTED_EMAIL}';`,
);

if (rows.length !== 1) {
  fail(`expected-one-local-qa-row got=${rows.length}`);
}

const row = rows[0];
const columns = Object.keys(row);
const unexpected = columns.filter((column) => !EXPECTED_COLUMNS.includes(column));
const missing = EXPECTED_COLUMNS.filter((column) => !columns.includes(column));

if (unexpected.length > 0) {
  fail(`unexpected-columns ${unexpected.join(',')}`);
}
if (missing.length > 0) {
  fail(`missing-columns ${missing.join(',')}`);
}

if (!Number.isInteger(Number(row.id)) || Number(row.id) <= 0) {
  fail(`invalid-id ${String(row.id)}`);
}
if (row.name !== EXPECTED_NAME) {
  fail(`wrong-name ${JSON.stringify(row.name)}`);
}
if (row.email !== EXPECTED_EMAIL) {
  fail(`wrong-email ${JSON.stringify(row.email)}`);
}
if (row.message !== EXPECTED_MESSAGE) {
  fail(`wrong-message ${JSON.stringify(row.message)}`);
}

if (typeof row.created_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.created_at)) {
  fail(`invalid-created-at ${JSON.stringify(row.created_at)}`);
}
const createdAt = new Date(row.created_at);
if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== row.created_at) {
  fail(`created-at-not-iso ${JSON.stringify(row.created_at)}`);
}

console.log(
  `CONTACT_ROW_OK email=${row.email} name=${JSON.stringify(row.name)} created_at=${row.created_at} columns=${columns.length}`,
);
console.log('CONTACT_VERIFY_OK localRows=1');