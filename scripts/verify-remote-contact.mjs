#!/usr/bin/env node
/**
 * Remote contact verification for the orchestrated release (M12 only).
 *
 * Fixed synthetic identity: `release-qa@dualorbit.invalid`. No real personal
 * data is ever written. The script:
 *
 *   1. deletes that identity remotely (pre-clean),
 *   2. POSTs a valid submission to the live contact endpoint,
 *   3. requires HTTP 201 with `{ ok: true }`,
 *   4. reads the row back through Wrangler and checks every stored field,
 *   5. deletes the identity again and requires a count of zero.
 *
 * Wrangler is invoked directly; no token file is read or written. Cleanup is
 * attempted on every outcome, and any failure exits non-zero.
 *
 * Prints `REMOTE_CONTACT_OK inserted=1 cleaned=1`.
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
const ENDPOINT = 'https://dualorbit.pages.dev/api/contact';
const IDENTITY = 'release-qa@dualorbit.invalid';
const NAME = 'Release QA';
const MESSAGE = 'Synthetic release verification enquiry.';
const COLUMNS = ['id', 'name', 'email', 'message', 'created_at'];

function runRemoteQuery(sql) {
  const stdout = execFileSync(
    process.execPath,
    [wranglerBin, 'd1', 'execute', DATABASE, '--remote', '--yes', '--json', '--command', sql],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  if (start === -1 || end < start) {
    throw new Error(`remote query did not return JSON: ${stdout.trim().slice(0, 200)}`);
  }

  const parsed = JSON.parse(stdout.slice(start, end + 1));
  const batch = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!batch || !Array.isArray(batch.results)) {
    throw new Error('remote query returned no results array');
  }
  return batch.results;
}

function deleteIdentity() {
  runRemoteQuery(`DELETE FROM contact_submissions WHERE email = '${IDENTITY}';`);
}

function countIdentity() {
  const rows = runRemoteQuery(
    `SELECT COUNT(*) AS total FROM contact_submissions WHERE email = '${IDENTITY}';`,
  );
  return rows.length === 1 ? Number(rows[0].total) : Number.NaN;
}

async function insertAndVerify() {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: NAME,
      email: IDENTITY,
      message: MESSAGE,
      website: '',
      startedAt: Date.now() - 10_000,
    }),
  });

  const bodyText = await response.text();
  if (response.status !== 201) {
    throw new Error(`expected 201, got ${response.status}: ${bodyText.slice(0, 200)}`);
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(`response was not JSON: ${bodyText.slice(0, 200)}`);
  }

  if (body === null || typeof body !== 'object' || body.ok !== true) {
    throw new Error(`response body was not { ok: true }: ${bodyText.slice(0, 200)}`);
  }

  const rows = runRemoteQuery(
    `SELECT * FROM contact_submissions WHERE email = '${IDENTITY}';`,
  );

  if (rows.length !== 1) {
    throw new Error(`expected exactly one stored row, found ${rows.length}`);
  }

  const row = rows[0];
  const columns = Object.keys(row);
  const unexpected = columns.filter((column) => !COLUMNS.includes(column));
  if (unexpected.length > 0) {
    throw new Error(`unexpected stored columns: ${unexpected.join(',')}`);
  }
  if (row.email !== IDENTITY) {
    throw new Error(`stored email mismatch: ${JSON.stringify(row.email)}`);
  }
  if (row.name !== NAME) {
    throw new Error(`stored name mismatch: ${JSON.stringify(row.name)}`);
  }
  if (row.message !== MESSAGE) {
    throw new Error(`stored message mismatch: ${JSON.stringify(row.message)}`);
  }
  if (
    typeof row.created_at !== 'string' ||
    Number.isNaN(Date.parse(row.created_at)) ||
    new Date(row.created_at).toISOString() !== row.created_at
  ) {
    throw new Error(`stored created_at is not ISO: ${JSON.stringify(row.created_at)}`);
  }
}

let failure = null;
let cleanupFailure = null;

try {
  deleteIdentity();
  await insertAndVerify();
} catch (error) {
  failure = error;
}

try {
  deleteIdentity();
} catch (error) {
  cleanupFailure = cleanupFailure ?? error;
}

try {
  const remaining = countIdentity();
  if (remaining !== 0) {
    cleanupFailure = cleanupFailure ?? new Error(`cleanup left ${remaining} row(s)`);
  }
} catch (error) {
  cleanupFailure = cleanupFailure ?? error;
}

if (failure || cleanupFailure) {
  if (failure) {
    console.error(`REMOTE_CONTACT_FAILED insert ${failure.message}`);
  }
  if (cleanupFailure) {
    console.error(`REMOTE_CONTACT_FAILED cleanup ${cleanupFailure.message}`);
  }
  process.exit(1);
}

console.log('REMOTE_CONTACT_OK inserted=1 cleaned=1');