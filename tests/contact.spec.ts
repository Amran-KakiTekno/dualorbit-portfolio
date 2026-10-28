import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * End-to-end contact tests against `wrangler pages dev` (real Pages Function,
 * local D1). `npm run test:contact` resets and migrates the local database
 * before this suite starts, so the first assertion can rely on an empty table.
 *
 * The suite runs in file order with a single worker: the method/validation
 * probes must not insert, and exactly one UI submission is inserted at the end.
 */

const projectRoot = process.cwd();
const require = createRequire(path.join(projectRoot, 'package.json'));
const wranglerManifestPath = require.resolve('wrangler/package.json');
const wranglerManifest = require('wrangler/package.json');
const wranglerBin = path.join(path.dirname(wranglerManifestPath), wranglerManifest.bin.wrangler);

const DATABASE = 'dualorbit-contacts';
const UI_EMAIL = 'local-qa@dualorbit.invalid';
const UI_NAME = 'Local QA';
const UI_MESSAGE = 'Synthetic local integration enquiry.';

function localQuery<T = Record<string, unknown>>(sql: string): T[] {
  const stdout = execFileSync(
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

  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  if (start === -1 || end < start) {
    throw new Error(`local query did not return JSON: ${stdout.trim().slice(0, 200)}`);
  }

  const parsed = JSON.parse(stdout.slice(start, end + 1));
  const batch = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!batch || !Array.isArray(batch.results)) {
    throw new Error('local query returned no results array');
  }
  return batch.results as T[];
}

function countRows(where = ''): number {
  const rows = localQuery<{ total: number }>(
    `SELECT COUNT(*) AS total FROM contact_submissions${where};`,
  );
  return Number(rows[0]?.total ?? Number.NaN);
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Local QA',
    email: UI_EMAIL,
    message: UI_MESSAGE,
    website: '',
    startedAt: Date.now() - 10_000,
    ...overrides,
  };
}

test.describe('contact Pages Function on local D1', () => {
  test('a direct GET is rejected with 405 and Allow: POST', async ({ request }) => {
    const response = await request.get('/api/contact');

    expect(response.status()).toBe(405);
    expect(response.headers()['allow']).toBe('POST');
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toMatchObject({ ok: false });
  });

  test('an invalid submission is rejected with 400 and writes nothing', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validPayload({ email: 'not-an-email', message: 'too short' }),
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(countRows()).toBe(0);
  });

  test('a too-new submission is rejected with 400 and writes nothing', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validPayload({ startedAt: Date.now() }),
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(countRows()).toBe(0);
  });

  test('a honeypot submission receives 201 but writes nothing', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validPayload({
        email: 'honeypot@dualorbit.invalid',
        website: '   https://spam.invalid   ',
      }),
    });

    expect(response.status()).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(countRows(" WHERE email = 'honeypot@dualorbit.invalid'")).toBe(0);
    expect(countRows()).toBe(0);
  });

  test('the real form shows success and inserts exactly the one QA row', async ({ page }) => {
    await page.goto('/');

    await page.fill('#contact-name', UI_NAME);
    await page.fill('#contact-email', UI_EMAIL);
    await page.fill('#contact-message', UI_MESSAGE);

    // Age the form the way a person would: the hidden timestamp moves back
    // 10 seconds before submission.
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#contact-startedAt');
      if (!input) {
        throw new Error('missing #contact-startedAt');
      }
      input.value = String(Date.now() - 10_000);
    });

    await page.getByRole('button', { name: 'Send enquiry' }).click();

    const status = page.getByTestId('contact-status');
    await expect(status).toHaveAttribute('data-state', 'success');
    await expect(status).toContainText('Thank you');

    const rows = localQuery<Record<string, unknown>>(
      `SELECT * FROM contact_submissions WHERE email = '${UI_EMAIL}';`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe(UI_NAME);
    expect(rows[0].email).toBe(UI_EMAIL);
    expect(rows[0].message).toBe(UI_MESSAGE);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['created_at', 'email', 'id', 'message', 'name'],
    );

    expect(countRows()).toBe(1);
  });
});