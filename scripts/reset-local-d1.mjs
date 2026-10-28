#!/usr/bin/env node
/**
 * Delete the local Wrangler persistence directory so the next local migration
 * starts from an empty database.
 *
 * This script only touches the filesystem. It never invokes Wrangler and can
 * never reach a remote database.
 */
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.join(projectRoot, '.wrangler', 'state');

const existed = existsSync(stateDir);

try {
  rmSync(stateDir, { recursive: true, force: true });
} catch (error) {
  console.error(`CONTACT_RESET_FAILED path=.wrangler/state error=${error.message}`);
  process.exit(1);
}

if (existsSync(stateDir)) {
  console.error('CONTACT_RESET_FAILED path=.wrangler/state reason=still-present');
  process.exit(1);
}

console.log(`CONTACT_RESET_OK path=.wrangler/state existed=${existed ? 'yes' : 'no'} remote=never`);