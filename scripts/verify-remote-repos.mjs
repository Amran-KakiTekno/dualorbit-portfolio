#!/usr/bin/env node
/**
 * Remote repository verification utility (owned by M12; not run in M01).
 *
 * Uses the authenticated `gh` CLI - no token file is read or written - to
 * require all nine repositories to exist under Amran-KakiTekno, to be public,
 * and to use `main` as the default branch.
 *
 * Run: npm run verify:remote-repos
 */
import { execFileSync } from 'node:child_process';

const OWNER = 'Amran-KakiTekno';

const REPOSITORIES = [
  'dualorbit-portfolio',
  'prodax-pipeline',
  'data-modelling',
  'rs-toolstring',
  'n8n-workflows',
  'data-quality-checker',
  'ws-ml',
  'service-type-analysis',
  'kssm-corpus',
];

const failures = [];

function ghApi(path) {
  const stdout = execFileSync('gh', ['api', path, '--jq', '.visibility, .default_branch'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return stdout.trim().split('\n');
}

for (const repository of REPOSITORIES) {
  let fields;
  try {
    fields = ghApi(`repos/${OWNER}/${repository}`);
  } catch (error) {
    failures.push(`${OWNER}/${repository}: not reachable through the GitHub API`);
    continue;
  }

  const [visibility, defaultBranch] = fields;
  if (visibility !== 'public') {
    failures.push(`${OWNER}/${repository}: visibility is "${visibility}", expected "public"`);
  }
  if (defaultBranch !== 'main') {
    failures.push(`${OWNER}/${repository}: default branch is "${defaultBranch}", expected "main"`);
  }
}

if (failures.length > 0) {
  console.error(`GITHUB_VERIFY_FAILED repos=${REPOSITORIES.length} failures=${failures.length}`);
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`GITHUB_VERIFY_OK repos=${REPOSITORIES.length}`);
