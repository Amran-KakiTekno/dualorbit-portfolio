import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest, type Env } from '../../functions/api/contact';

/**
 * Function-level tests for the `/api/contact` Pages Function.
 *
 * A fake D1 object records every `prepare`/`bind`/`run` call so the tests can
 * prove exactly what would be written and that rejected requests never reach
 * the database.
 */

const NOW = Date.parse('2026-10-28T12:00:00.000Z');
const ENDPOINT = 'https://dualorbit.pages.dev/api/contact';

interface InsertRecord {
  sql: string;
  values: unknown[];
  runCalls: number;
}

interface FakeDb {
  env: Env;
  inserts: InsertRecord[];
}

function createFakeDb(options: { throws?: boolean } = {}): FakeDb {
  const inserts: InsertRecord[] = [];

  const db = {
    prepare(sql: string) {
      const record: InsertRecord = { sql, values: [], runCalls: 0 };
      inserts.push(record);

      return {
        bind(...values: unknown[]) {
          record.values = values;
          return {
            async run() {
              record.runCalls += 1;
              if (options.throws) {
                throw new Error('D1_ERROR: no such table: contact_submissions: SQLITE_ERROR');
              }
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
        async run() {
          record.runCalls += 1;
          if (options.throws) {
            throw new Error('D1_ERROR: no such table: contact_submissions: SQLITE_ERROR');
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
    },
  };

  return { env: { DB: db as unknown as Env['DB'] }, inserts };
}

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Local QA',
    email: 'local-qa@dualorbit.invalid',
    message: 'Synthetic local integration enquiry.',
    website: '',
    startedAt: NOW - 10_000,
    ...overrides,
  };
}

interface InvokeOptions {
  method?: string;
  body?: unknown;
  raw?: string;
  contentType?: string | null;
  headers?: Record<string, string>;
}

async function invoke(env: Env, options: InvokeOptions = {}) {
  const method = options.method ?? 'POST';
  const contentType =
    options.contentType === undefined ? 'application/json' : options.contentType;

  const rawBody =
    options.raw !== undefined
      ? options.raw
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined;

  const headers = new Headers(options.headers ?? {});
  if (contentType !== null) {
    headers.set('Content-Type', contentType);
  }

  const request = new Request(ENDPOINT, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : rawBody,
  });

  const response = await onRequest({ request, env });
  const text = await response.text();

  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { response, text, json };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/contact — accepted submissions', () => {
  it('returns exactly 201 { ok: true } and inserts one bound row with the server time', async () => {
    const { env, inserts } = createFakeDb();
    const { response, json, text } = await invoke(env, { body: payload() });

    expect(response.status).toBe(201);
    expect(json).toEqual({ ok: true });
    expect(text).toBe('{"ok":true}');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toContain('application/json');

    expect(inserts).toHaveLength(1);
    expect(inserts[0].runCalls).toBe(1);
    expect(inserts[0].sql).toBe(
      'INSERT INTO contact_submissions (name, email, message, created_at) VALUES (?, ?, ?, ?)',
    );
    expect(inserts[0].values).toEqual([
      'Local QA',
      'local-qa@dualorbit.invalid',
      'Synthetic local integration enquiry.',
      '2026-10-28T12:00:00.000Z',
    ]);
  });

  it('never stores startedAt or the honeypot and never interpolates values into SQL', async () => {
    const { env, inserts } = createFakeDb();
    await invoke(env, {
      body: payload({ website: '   ', name: '  Ada Lovelace  ', message: '  A real enquiry message.  ' }),
    });

    expect(inserts).toHaveLength(1);
    const rawValues = JSON.stringify(inserts[0].values);
    expect(rawValues).not.toContain(String(NOW - 10_000));
    expect(rawValues).not.toContain('website');
    expect(inserts[0].sql).not.toContain('Ada Lovelace');
    expect(inserts[0].sql).not.toContain('local-qa');
    expect(inserts[0].sql.match(/\?/g)).toHaveLength(4);
  });

  it('trims whitespace around stored values', async () => {
    const { env, inserts } = createFakeDb();
    await invoke(env, {
      body: payload({
        name: '  Local QA  ',
        email: '  local-qa@dualorbit.invalid  ',
        message: '  Synthetic local integration enquiry.  ',
      }),
    });

    expect(inserts[0].values).toEqual([
      'Local QA',
      'local-qa@dualorbit.invalid',
      'Synthetic local integration enquiry.',
      '2026-10-28T12:00:00.000Z',
    ]);
  });

  it('accepts a JSON content type with a charset parameter', async () => {
    const { env } = createFakeDb();
    const { response } = await invoke(env, {
      body: payload(),
      contentType: 'application/json; charset=utf-8',
    });
    expect(response.status).toBe(201);
  });

  it('accepts the minimum form age of exactly 3 seconds', async () => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, { body: payload({ startedAt: NOW - 3_000 }) });
    expect(response.status).toBe(201);
    expect(inserts).toHaveLength(1);
  });

  it('accepts a form age of exactly 24 hours', async () => {
    const { env } = createFakeDb();
    const { response } = await invoke(env, {
      body: payload({ startedAt: NOW - 24 * 60 * 60 * 1000 }),
    });
    expect(response.status).toBe(201);
  });

  it('ignores unknown extra JSON keys', async () => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, {
      body: payload({ extra: 'ignored', admin: true }),
    });
    expect(response.status).toBe(201);
    expect(inserts[0].values).toHaveLength(4);
  });
});

describe('POST /api/contact — method and content-type gates', () => {
  it.each(['GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])(
    'rejects %s with 405 and Allow: POST',
    async (method) => {
      const { env, inserts } = createFakeDb();
      const { response, json } = await invoke(env, { method });

      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(json).toMatchObject({ ok: false });
      expect(inserts).toHaveLength(0);
    },
  );

  it.each([
    'text/plain',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'application/json-patch+json',
    'application/jsonx',
    null,
  ])('rejects content type %s with 400', async (contentType) => {
    const { env, inserts } = createFakeDb();
    const { response, json } = await invoke(env, {
      body: payload(),
      contentType: contentType as string | null,
    });

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ ok: false });
    expect(inserts).toHaveLength(0);
  });
});

describe('POST /api/contact — body parsing', () => {
  it.each([
    ['malformed JSON', '{"name":'],
    ['empty body', ''],
    ['JSON array', '[1,2,3]'],
    ['JSON null', 'null'],
    ['JSON string primitive', '"hello"'],
    ['JSON number primitive', '42'],
    ['JSON boolean primitive', 'true'],
  ])('rejects %s with 400 without throwing', async (_label, raw) => {
    const { env, inserts } = createFakeDb();
    const { response, json, text } = await invoke(env, { raw });

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ ok: false });
    expect(text).not.toContain('SQLITE');
    expect(inserts).toHaveLength(0);
  });

  it('rejects a raw body over 16 KiB with 400 before field validation', async () => {
    const { env, inserts } = createFakeDb();
    const body = payload({ pad: 'x'.repeat(17_000) });
    const { response, json } = await invoke(env, { body });

    expect(JSON.stringify(body).length).toBeGreaterThan(16 * 1024);
    expect(response.status).toBe(400);
    expect(json).toMatchObject({ ok: false });
    expect(inserts).toHaveLength(0);
  });

  it('accepts a body just under 16 KiB that is otherwise valid', async () => {
    const { env, inserts } = createFakeDb();
    const body = payload({ pad: 'x'.repeat(14_000) });
    const { response } = await invoke(env, { body });

    expect(JSON.stringify(body).length).toBeLessThan(16 * 1024);
    expect(response.status).toBe(201);
    expect(inserts).toHaveLength(1);
  });

  it('rejects a body whose declared Content-Length exceeds the cap', async () => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, {
      body: payload(),
      headers: { 'Content-Length': String(16 * 1024 + 1) },
    });

    expect(response.status).toBe(400);
    expect(inserts).toHaveLength(0);
  });
});

describe('POST /api/contact — field types', () => {
  it.each([
    ['name is a number', { name: 42 }],
    ['name is missing', { name: undefined }],
    ['email is an object', { email: { value: 'local-qa@dualorbit.invalid' } }],
    ['message is a number', { message: 123 }],
    ['website is null', { website: null }],
    ['website is missing', { website: undefined }],
    ['startedAt is a string', { startedAt: String(NOW - 10_000) }],
    ['startedAt is null', { startedAt: null }],
    ['startedAt is missing', { startedAt: undefined }],
  ])('rejects when %s with 400', async (_label, overrides) => {
    const { env, inserts } = createFakeDb();
    const body = payload(overrides);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete body[key];
    }
    const { response, json } = await invoke(env, { body });

    expect(response.status).toBe(400);
    expect(json).toMatchObject({ ok: false });
    expect(inserts).toHaveLength(0);
  });
});

describe('POST /api/contact — length boundaries', () => {
  it.each([
    ['name of 2', { name: 'Al' }, 201],
    ['name of 80', { name: 'N'.repeat(80) }, 201],
    ['name of 1', { name: 'A' }, 400],
    ['name of 81', { name: 'N'.repeat(81) }, 400],
    ['name of 2 after trimming', { name: '  Al  ' }, 201],
    ['blank-padded name of 1', { name: '  A  ' }, 400],
  ])('%s is handled with %i', async (_label, overrides, expected) => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, { body: payload(overrides) });

    expect(response.status).toBe(expected);
    expect(inserts).toHaveLength(expected === 201 ? 1 : 0);
  });

  it.each([
    ['email of 254', { email: `${'a'.repeat(249)}@b.co` }, 201],
    ['email of 255', { email: `${'a'.repeat(250)}@b.co` }, 400],
    ['email of 2', { email: 'ab' }, 400],
    ['email without @', { email: 'local-qa.dualorbit.invalid' }, 400],
    ['email with two @', { email: 'local@@dualorbit.invalid' }, 400],
    ['email with a space', { email: 'local qa@dualorbit.invalid' }, 400],
    ['email without a dot', { email: 'local-qa@dualorbit' }, 400],
    ['email padded with spaces', { email: '  local-qa@dualorbit.invalid  ' }, 201],
  ])('%s is handled with %i', async (_label, overrides, expected) => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, { body: payload(overrides) });

    expect(response.status).toBe(expected);
    expect(inserts).toHaveLength(expected === 201 ? 1 : 0);
  });

  it.each([
    ['message of 10', { message: 'M'.repeat(10) }, 201],
    ['message of 2000', { message: 'M'.repeat(2000) }, 201],
    ['message of 9', { message: 'M'.repeat(9) }, 400],
    ['message of 2001', { message: 'M'.repeat(2001) }, 400],
    ['message of 10 after trimming', { message: `   ${'M'.repeat(10)}   ` }, 201],
    ['blank-padded message of 9', { message: `   ${'M'.repeat(9)}   ` }, 400],
  ])('%s is handled with %i', async (_label, overrides, expected) => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, { body: payload(overrides) });

    expect(response.status).toBe(expected);
    expect(inserts).toHaveLength(expected === 201 ? 1 : 0);
  });
});

describe('POST /api/contact — timing rules', () => {
  it.each([
    ['2.999 seconds old', { startedAt: NOW - 2_999 }, 400],
    ['20 seconds in the future', { startedAt: NOW + 20_000 }, 400],
    ['61 seconds in the future', { startedAt: NOW + 61_000 }, 400],
    ['24 hours and 1 ms old', { startedAt: NOW - (24 * 60 * 60 * 1000 + 1) }, 400],
    ['7 days old', { startedAt: NOW - 7 * 24 * 60 * 60 * 1000 }, 400],
  ])('rejects a timestamp %s with %i', async (_label, overrides, expected) => {
    const { env, inserts } = createFakeDb();
    const { response } = await invoke(env, { body: payload(overrides) });

    expect(response.status).toBe(expected);
    expect(inserts).toHaveLength(0);
  });
});

describe('POST /api/contact — honeypot', () => {
  it.each([
    ['https://spam.invalid'],
    ['   https://spam.invalid   '],
    ['a'],
  ])('returns a fake 201 for a non-empty honeypot (%s) without touching D1', async (website) => {
    const { env, inserts } = createFakeDb();
    const { response, json, text } = await invoke(env, {
      body: payload({ website, email: 'honeypot@dualorbit.invalid' }),
    });

    expect(response.status).toBe(201);
    expect(json).toEqual({ ok: true });
    expect(text).toBe('{"ok":true}');
    expect(inserts).toHaveLength(0);
  });
});

describe('POST /api/contact — storage failures', () => {
  it('returns a generic 500 with no database detail when D1 throws', async () => {
    const { env, inserts } = createFakeDb({ throws: true });
    const { response, json, text } = await invoke(env, { body: payload() });

    expect(response.status).toBe(500);
    expect(json).toEqual({ ok: false, error: 'Unable to store your enquiry.' });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].runCalls).toBe(1);

    expect(text).not.toMatch(/SQLITE|D1|no such table|contact_submissions|localhost|binding/i);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('does not expose stack traces on validation failures', async () => {
    const { env } = createFakeDb();
    const { text } = await invoke(env, { body: payload({ name: 'A' }) });
    expect(text).not.toMatch(/at \w+ \(|\.ts:\d+|stack/i);
  });
});