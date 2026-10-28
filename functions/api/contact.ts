/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Function for `POST /api/contact`.
 *
 * The browser sends exactly one JSON document: `name`, `email`, `message`, the
 * honeypot `website`, and a numeric `startedAt` (epoch milliseconds, captured
 * when the form mounted). A valid, human-timed submission is written to D1 and
 * answered with HTTP 201 and `{ "ok": true }`.
 *
 * Design constraints:
 * - Reject every method except POST with 405 and `Allow: POST`.
 * - Refuse a raw body larger than 16 KiB before parsing it.
 * - Never interpolate user values into SQL; only bound parameters are used.
 * - Never store `website` or `startedAt`.
 * - Never leak a stack trace, SQL, binding name, or database detail.
 * - No read, list, or admin route exists in this file.
 */

export interface Env {
  DB: D1Database;
}

/** The subset of the Pages context this handler uses. */
export interface PagesContext<E> {
  request: Request;
  env: E;
}

export type PagesHandler<E> = (context: PagesContext<E>) => Promise<Response> | Response;

const MAX_BODY_BYTES = 16 * 1024;

const NAME_MIN = 2;
const NAME_MAX = 80;
const EMAIL_MIN = 3;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

const MIN_FORM_AGE_MS = 3_000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60_000;

/** Conventional single-`@` shape, identical to the browser rule. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INSERT_SQL =
  'INSERT INTO contact_submissions (name, email, message, created_at) VALUES (?, ?, ?, ?)';

const SAFE_MESSAGES = {
  method: 'Use POST to submit this form.',
  contentType: 'Send the form as application/json.',
  tooLarge: 'The request body is too large.',
  unreadable: 'The request body could not be read as JSON.',
  invalid: 'Please check the submitted fields and try again.',
  server: 'Unable to store your enquiry.',
} as const;

function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function badRequest(message: string): Response {
  return jsonResponse(400, { ok: false, error: message });
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

interface ParsedFields {
  name: string;
  email: string;
  message: string;
  website: string;
  startedAt: number;
}

type ParseResult = { ok: true; fields: ParsedFields } | { ok: false; response: Response };

/**
 * Enforce the body cap, JSON content type, JSON shape, and field types before
 * any business validation. Nothing here throws on malformed input.
 */
async function readFields(request: Request): Promise<ParseResult> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json\s*(?:;|$)/i.test(contentType.trim())) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.contentType) };
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.tooLarge) };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: badRequest(SAFE_MESSAGES.unreadable) };
  }

  if (byteLength(raw) > MAX_BODY_BYTES) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.tooLarge) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, response: badRequest(SAFE_MESSAGES.unreadable) };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  const record = parsed as Record<string, unknown>;
  const { name, email, message, website, startedAt } = record;

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    typeof website !== 'string'
  ) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  return { ok: true, fields: { name, email, message, website, startedAt } };
}

type ValidationResult =
  | { ok: true; name: string; email: string; message: string }
  | { ok: false; response: Response };

function validate(fields: ParsedFields, now: number): ValidationResult {
  const name = fields.name.trim();
  const email = fields.email.trim();
  const message = fields.message.trim();

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  if (
    email.length < EMAIL_MIN ||
    email.length > EMAIL_MAX ||
    !EMAIL_PATTERN.test(email)
  ) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  const age = now - fields.startedAt;
  if (fields.startedAt > now + MAX_FUTURE_SKEW_MS) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }
  if (age < MIN_FORM_AGE_MS) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }
  if (age > MAX_FORM_AGE_MS) {
    return { ok: false, response: badRequest(SAFE_MESSAGES.invalid) };
  }

  return { ok: true, name, email, message };
}

async function handlePost(context: PagesContext<Env>): Promise<Response> {
  const parsed = await readFields(context.request);
  if (!parsed.ok) {
    return parsed.response;
  }

  // Honeypot: answer exactly like a success and touch nothing. A bot learns
  // nothing about the trap; a real submission always leaves this empty.
  if (parsed.fields.website.trim() !== '') {
    return jsonResponse(201, { ok: true });
  }

  const validated = validate(parsed.fields, Date.now());
  if (!validated.ok) {
    return validated.response;
  }

  try {
    await context.env.DB.prepare(INSERT_SQL)
      .bind(validated.name, validated.email, validated.message, new Date().toISOString())
      .run();
  } catch {
    // Deliberately generic: no error text, SQL, binding, or database name.
    return jsonResponse(500, { ok: false, error: SAFE_MESSAGES.server });
  }

  return jsonResponse(201, { ok: true });
}

/** Single entry point: Pages routes `functions/api/contact.ts` to `/api/contact`. */
export const onRequest: PagesHandler<Env> = async (context) => {
  if (context.request.method !== 'POST') {
    return jsonResponse(
      405,
      { ok: false, error: SAFE_MESSAGES.method },
      { Allow: 'POST' },
    );
  }

  try {
    return await handlePost(context);
  } catch {
    return jsonResponse(500, { ok: false, error: SAFE_MESSAGES.server });
  }
};