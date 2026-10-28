#!/usr/bin/env node
/**
 * Mechanical contract check for the public content manifest.
 *
 * Every rule the portfolio promises is asserted here so that a copy edit
 * cannot quietly drop a demo, rename a status, publish an address, or point a
 * link somewhere unapproved.
 *
 * Run: npm run check:contract
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../src/content/portfolio.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    failures.push(message);
  }
}

function checkEqual(actual, expected, message) {
  check(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

/** Descriptions are prose: a single trailing full stop is not a content change. */
function checkSameDescription(actual, expected, message) {
  const strip = (value) => String(value ?? '').replace(/\.\s*$/, '');
  check(
    strip(actual) === strip(expected),
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
}

const DEMO_MANIFEST = [
  {
    id: 'prodax-pipeline',
    discipline: 'Data Engineering',
    technique: 'Initial and incremental synchronisation with revision checkpoints and document links',
  },
  {
    id: 'data-modelling',
    discipline: 'Data Engineering',
    technique: 'Reconciling heterogeneous source sheets into a governed master model',
  },
  {
    id: 'rs-toolstring',
    discipline: 'Data Engineering',
    technique: 'Stepwise filtering, unit normalisation, joins, and unmatched-row analysis',
  },
  {
    id: 'n8n-workflows',
    discipline: 'Data Engineering',
    technique: 'Workflow validation, branching, bounded retries, and execution visibility',
  },
  {
    id: 'data-quality-checker',
    discipline: 'Data Engineering',
    technique: 'Pluggable CSV/JSON connectors and configurable validation rules',
  },
  {
    id: 'ws-ml',
    discipline: 'Data Analysis',
    technique: 'Interactive filtering, aggregation, and operational pattern exploration',
  },
  {
    id: 'service-type-analysis',
    discipline: 'Data Analysis',
    technique: 'Knowledge-assisted classification with confidence-based human review',
  },
  {
    id: 'kssm-corpus',
    discipline: 'Data Analysis',
    technique: 'Searchable original curriculum-shaped notes and question items',
  },
];

/**
 * Cloudflare assigned a suffixed canonical subdomain to the n8n Pages project,
 * so this demo's live URL is not derived from its id.
 */
const LIVE_URL_OVERRIDES = {
  'n8n-workflows': 'https://n8n-workflows-a8s.pages.dev',
};

function demoLiveUrl(id) {
  return LIVE_URL_OVERRIDES[id] ?? `https://${id}.pages.dev`;
}

const SYSTEM_MANIFEST = [
  {
    id: 'big-grin-dental',
    status: 'Live deployment',
    liveUrl: 'https://big-grin-dental.pages.dev',
    description: 'Dental booking, staff workflow, ledger, and agreement interfaces',
  },
  {
    id: 'tusyen',
    status: 'Live deployment',
    liveUrl: 'https://tusyen.pages.dev',
    description: 'Malaysian education application workflows',
  },
  {
    id: 'synergy-solution',
    status: 'Live deployment',
    liveUrl: 'https://synergy-solution.pages.dev',
    description: 'LPG supply and sales operations',
  },
  {
    id: 'ezibiz-hub',
    status: 'Demo shells / selected live deployments',
    liveUrl: undefined,
    sourceUrl: 'https://github.com/Amran-KakiTekno/ezibiz-hub',
    description: 'Modular business operations suite',
  },
  {
    id: 'diana-the-cleaning-fairy',
    status: 'Live deployment',
    liveUrl: 'https://diana-the-cleaning-fairy.kakitekno.workers.dev',
    description: 'Cleaning-service booking workflow',
  },
  {
    id: 'haze-workz',
    status: 'In development',
    liveUrl: 'https://haze-workz.vercel.app',
    description: '3D/image workflow experiment',
  },
  { id: 'business-capability-universe', status: 'Internal', liveUrl: undefined, description: 'Capability modelling and assessment workbench concepts' },
  { id: 'service_system', status: 'Internal', liveUrl: undefined, description: 'Service-management workflow application' },
  { id: '06-accountant-portable', status: 'In development', liveUrl: undefined, description: 'Portable business-document workflow' },
  { id: '11-misi-dskp', status: 'In development', liveUrl: undefined, description: 'Offline-first KSSM STEM mission interface' },
  { id: 'PinjamJap', status: 'Internal', liveUrl: undefined, description: 'Peer-to-peer equipment-rental workflow concept' },
  {
    id: 'sudoku-quest',
    status: 'Live deployment',
    liveUrl: 'https://sudoku-quest.pages.dev',
    description: 'Interactive puzzle and canvas UI',
  },
];

const MODULE_MANIFEST = [
  {
    id: 'ezibiz-jmb',
    status: 'Live demo shell',
    liveUrl: 'https://ezibiz-jmb.pages.dev',
    sourceUrl: 'https://github.com/Amran-KakiTekno/ezibiz-jmb',
  },
  {
    id: 'ezibiz-crms',
    status: 'Live demo shell',
    liveUrl: 'https://ezibiz-crms.pages.dev',
    sourceUrl: 'https://github.com/Amran-KakiTekno/ezibiz-crms',
  },
  {
    id: 'ezibiz-hrms',
    status: 'Live demo shell',
    liveUrl: 'https://ezibiz-hrms.pages.dev',
    sourceUrl: 'https://github.com/Amran-KakiTekno/ezibiz-hrms',
  },
  {
    id: 'ezibiz-akaun',
    status: 'Source-available demo shell',
    liveUrl: undefined,
    sourceUrl: 'https://github.com/Amran-KakiTekno/ezibiz-akaun',
  },
];

const PRIVACY_NOTE =
  'We store your name, email, message, and submission timestamp so we can respond to your enquiry; we do not share them.';

const ALLOWED_STATUSES = [
  'Live deployment',
  'Demo shells / selected live deployments',
  'In development',
  'Internal',
  'Live demo shell',
  'Source-available demo shell',
];

const ALLOWED_URLS = new Set([
  ...DEMO_MANIFEST.flatMap((demo) => [
    demoLiveUrl(demo.id),
    `https://github.com/Amran-KakiTekno/${demo.id}`,
  ]),
  ...SYSTEM_MANIFEST.flatMap((entry) => [entry.liveUrl, entry.sourceUrl].filter(Boolean)),
  ...MODULE_MANIFEST.flatMap((module) => [module.liveUrl, module.sourceUrl].filter(Boolean)),
]);

// ---------------------------------------------------------------- brand / nav

checkEqual(manifest.brand?.name, 'Dual Orbit', 'brand.name must be "Dual Orbit"');
checkEqual(
  manifest.brand?.tagline,
  'Data engineering, analysis, and systems that move work forward.',
  'brand.tagline must match the published tagline',
);
checkEqual(
  manifest.brand?.footerNote,
  'Engineering repositories by Kaki Tekno',
  'brand.footerNote must match the published footer line',
);

const navLabels = (manifest.navigation ?? []).map((item) => item.label);
checkEqual(
  navLabels.join('|'),
  'Capabilities|Data proof|Systems|Contact',
  'navigation labels must be Capabilities, Data proof, Systems, Contact',
);
const navHrefs = (manifest.navigation ?? []).map((item) => item.href);
checkEqual(
  navHrefs.join('|'),
  '#capabilities|#data-proof|#systems|#contact',
  'navigation targets must be #capabilities, #data-proof, #systems, #contact',
);

// ---------------------------------------------------------------- capabilities

const capabilityTitles = (manifest.capabilities?.items ?? []).map((item) => item.title);
checkEqual(
  capabilityTitles.join('|'),
  'Data Engineering|Data Analysis|System Development',
  'capability cards must be Data Engineering, Data Analysis, System Development',
);
for (const capability of manifest.capabilities?.items ?? []) {
  check(
    Array.isArray(capability.problems) && capability.problems.length > 0,
    `capability ${capability.id} must describe problem classes`,
  );
  check(
    Array.isArray(capability.methods) && capability.methods.length > 0,
    `capability ${capability.id} must describe methods`,
  );
}

// ---------------------------------------------------------------------- demos

const groups = manifest.dataProof?.groups ?? [];
const deGroup = groups.find((group) => group.id === 'data-engineering');
const daGroup = groups.find((group) => group.id === 'data-analysis');
check(Boolean(deGroup), 'data proof must contain a Data Engineering group');
check(Boolean(daGroup), 'data proof must contain a Data Analysis group');

const deDemos = deGroup?.demos ?? [];
const daDemos = daGroup?.demos ?? [];
checkEqual(deDemos.length, 5, 'Data Engineering proof must contain five demos');
checkEqual(daDemos.length, 3, 'Data Analysis proof must contain three demos');

const allDemos = [...deDemos, ...daDemos];
checkEqual(allDemos.length, 8, 'data proof must contain eight demos in total');
checkEqual(
  allDemos.map((demo) => demo.id).join('|'),
  DEMO_MANIFEST.map((demo) => demo.id).join('|'),
  'demo ids must match the published manifest exactly, in order',
);

for (const expected of DEMO_MANIFEST) {
  const demo = allDemos.find((item) => item.id === expected.id);
  if (!demo) {
    check(false, `demo ${expected.id} is missing`);
    continue;
  }
  checkEqual(demo.discipline, expected.discipline, `demo ${expected.id} discipline`);
  checkEqual(demo.status, 'Synthetic interactive demo', `demo ${expected.id} status`);
  checkEqual(demo.technique, expected.technique, `demo ${expected.id} technique copy`);
  checkEqual(demo.liveUrl, demoLiveUrl(expected.id), `demo ${expected.id} live url`);
  checkEqual(
    demo.sourceUrl,
    `https://github.com/Amran-KakiTekno/${expected.id}`,
    `demo ${expected.id} source url`,
  );
  checkEqual(demo.liveLabel, 'Open demo', `demo ${expected.id} live link label`);
  checkEqual(demo.sourceLabel, 'Source', `demo ${expected.id} source link label`);
  check(
    typeof demo.technique === 'string' && demo.technique.length > 0,
    `demo ${expected.id} must carry a description of the technique`,
  );
}

// ------------------------------------------------------------------- systems

const entries = manifest.systems?.entries ?? [];
checkEqual(entries.length, 12, 'systems must contain twelve entries');
checkEqual(
  entries.map((entry) => entry.id).join('|'),
  SYSTEM_MANIFEST.map((entry) => entry.id).join('|'),
  'system entry ids must match the published manifest exactly, in order',
);

for (const expected of SYSTEM_MANIFEST) {
  const entry = entries.find((item) => item.id === expected.id);
  if (!entry) {
    check(false, `system entry ${expected.id} is missing`);
    continue;
  }
  checkEqual(entry.status, expected.status, `system entry ${expected.id} status`);
  checkSameDescription(entry.description, expected.description, `system entry ${expected.id} description`);
  check(
    ALLOWED_STATUSES.includes(entry.status),
    `system entry ${expected.id} uses a status outside the allowlist`,
  );
  checkEqual(entry.liveUrl, expected.liveUrl, `system entry ${expected.id} live url`);
  if (expected.sourceUrl !== undefined) {
    checkEqual(entry.sourceUrl, expected.sourceUrl, `system entry ${expected.id} source url`);
  }
  if (expected.liveUrl === undefined) {
    check(
      entry.liveUrl === undefined,
      `system entry ${expected.id} must not carry a top-level live url`,
    );
  }
  check(
    !/shipped|production/i.test(entry.status),
    `system entry ${expected.id} must not claim a shipped or production status`,
  );
}

// haze-workz keeps its development link even though it is not live.
const haze = entries.find((entry) => entry.id === 'haze-workz');
checkEqual(haze?.liveUrl, 'https://haze-workz.vercel.app', 'haze-workz must retain its development link');
checkEqual(haze?.status, 'In development', 'haze-workz must stay In development');

// EziBiz is one family entry with exactly four module records.
const ezibiz = entries.find((entry) => entry.id === 'ezibiz-hub');
check(
  ezibiz?.liveUrl === undefined,
  'ezibiz-hub must not carry a top-level live url',
);
const modules = ezibiz?.modules ?? [];
checkEqual(modules.length, 4, 'ezibiz-hub must contain exactly four module records');
checkEqual(
  modules.map((module) => module.id).join('|'),
  MODULE_MANIFEST.map((module) => module.id).join('|'),
  'ezibiz module ids must match the published manifest exactly, in order',
);
for (const expected of MODULE_MANIFEST) {
  const module = modules.find((item) => item.id === expected.id);
  if (!module) {
    check(false, `ezibiz module ${expected.id} is missing`);
    continue;
  }
  checkEqual(module.status, expected.status, `ezibiz module ${expected.id} status`);
  checkEqual(module.liveUrl, expected.liveUrl, `ezibiz module ${expected.id} live url`);
  checkEqual(module.sourceUrl, expected.sourceUrl, `ezibiz module ${expected.id} source url`);
  if (expected.liveUrl === undefined) {
    check(
      module.liveUrl === undefined,
      `ezibiz module ${expected.id} must not carry a live url`,
    );
  }
}

// ------------------------------------------------------------------- contact

checkEqual(manifest.contact?.privacyNote, PRIVACY_NOTE, 'privacy note must match the published sentence');
const privacyNote = manifest.contact?.privacyNote ?? '';
check(
  (privacyNote.match(/\./g) ?? []).length === 1,
  'privacy note must be exactly one sentence',
);
check(
  !/(^|\s)(and|or)\s+we\b/i.test(privacyNote) || privacyNote.split(';').length === 2,
  'privacy note must stay a single sentence',
);

// --------------------------------------------------- no address, no fallback

const manifestText = JSON.stringify(manifest);

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const emailMatch = manifestText.match(EMAIL_PATTERN);
check(
  emailMatch === null,
  `the public manifest must not contain an email address (found ${emailMatch ? emailMatch[0] : ''})`,
);
check(!/mailto:/i.test(manifestText), 'the public manifest must not contain a mailto link');
check(!/tel:/i.test(manifestText), 'the public manifest must not contain a telephone link');
check(
  !/\bshipped\b/i.test(manifestText) && !/\bproduction\b/i.test(manifestText),
  'the public manifest must not claim shipped or production status',
);

// The manifest is not the whole public surface. The rendered page is built from
// `src/**`, `index.html`, and `public/**`, so the same no-address rule is
// applied to every one of those files: an address must not be able to reach
// the page through a component, a stylesheet, or the HTML shell.

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function walkFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkFiles(fullPath));
    } else {
      found.push(fullPath);
    }
  }
  return found;
}

function collectPublicSourceFiles() {
  const files = [join(repoRoot, 'index.html')];
  for (const directory of ['src', 'public']) {
    const absolute = join(repoRoot, directory);
    if (existsSync(absolute)) {
      files.push(...walkFiles(absolute));
    }
  }
  return files;
}

const publicSourceFiles = collectPublicSourceFiles();
check(publicSourceFiles.length > 0, 'the public source walk must find files to scan');

for (const file of publicSourceFiles) {
  const relativePath = relative(repoRoot, file).split(/[\\/]/).join('/');
  const text = readFileSync(file, 'utf8');

  const fileEmailMatch = text.match(EMAIL_PATTERN);
  check(
    fileEmailMatch === null,
    `public source file ${relativePath} must not contain an email address (found ${
      fileEmailMatch ? fileEmailMatch[0] : ''
    })`,
  );
  check(
    !/mailto:/i.test(text),
    `public source file ${relativePath} must not contain a mailto link`,
  );
  check(
    !/tel:/i.test(text),
    `public source file ${relativePath} must not contain a telephone link`,
  );
}

const urlMatches = manifestText.match(/https?:\/\/[^"'\\ ]+/g) ?? [];
for (const url of urlMatches) {
  check(ALLOWED_URLS.has(url), `unexpected url in the public manifest: ${url}`);
}

// Every url-bearing field must point at an approved destination.
for (const demo of allDemos) {
  check(ALLOWED_URLS.has(demo.liveUrl), `demo ${demo.id} live url is not approved`);
  check(ALLOWED_URLS.has(demo.sourceUrl), `demo ${demo.id} source url is not approved`);
}
for (const entry of entries) {
  if (entry.liveUrl !== undefined) {
    check(ALLOWED_URLS.has(entry.liveUrl), `system entry ${entry.id} live url is not approved`);
  }
  if (entry.sourceUrl !== undefined) {
    check(ALLOWED_URLS.has(entry.sourceUrl), `system entry ${entry.id} source url is not approved`);
  }
}
for (const module of modules) {
  if (module.liveUrl !== undefined) {
    check(ALLOWED_URLS.has(module.liveUrl), `ezibiz module ${module.id} live url is not approved`);
  }
  if (module.sourceUrl !== undefined) {
    check(ALLOWED_URLS.has(module.sourceUrl), `ezibiz module ${module.id} source url is not approved`);
  }
}

// --------------------------------------------------------------------- report

if (failures.length > 0) {
  console.error(`PORTFOLIO_CONTRACT_FAILED checks=${checks} failures=${failures.length}`);
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`PORTFOLIO_CONTRACT_OK demos=${allDemos.length} systems=${entries.length}`);
