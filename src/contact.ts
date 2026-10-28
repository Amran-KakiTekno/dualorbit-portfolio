/**
 * Contact client contract.
 *
 * The browser talks to exactly one endpoint: a same-origin `POST /api/contact`
 * that a Cloudflare Pages Function handles and writes into D1. No D1 access,
 * no credential, and no alternate delivery path exists in this module.
 */

export interface ContactDraft {
  name: string;
  email: string;
  message: string;
  /** Honeypot. Must stay empty for a real submission. */
  website: string;
  /** Epoch milliseconds, captured once when the form was mounted. */
  startedAt: number | null;
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  website: string;
  startedAt: number;
}

export interface ContactValidationErrors {
  name?: string;
  email?: string;
  message?: string;
  startedAt?: string;
}

export type ContactValidationResult =
  | { ok: true; value: ContactPayload }
  | { ok: false; errors: ContactValidationErrors };

export const CONTACT_ENDPOINT = '/api/contact';

/** Conventional single-`@` shape: one local part, one domain, one dot. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const EMAIL_MIN = 3;
export const EMAIL_MAX = 254;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export class ContactRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ContactRequestError';
    this.status = status;
  }
}

/**
 * Browser-side validation. The server repeats the same limits; this exists so
 * a mistake is reported before a request is made.
 */
export function validateContactDraft(draft: ContactDraft): ContactValidationResult {
  const errors: ContactValidationErrors = {};

  const name = draft.name.trim();
  if (name.length < NAME_MIN) {
    errors.name = `Please enter at least ${NAME_MIN} characters.`;
  } else if (name.length > NAME_MAX) {
    errors.name = `Please keep your name to ${NAME_MAX} characters or fewer.`;
  }

  const email = draft.email.trim();
  if (email.length < EMAIL_MIN) {
    errors.email = `Please enter at least ${EMAIL_MIN} characters.`;
  } else if (email.length > EMAIL_MAX) {
    errors.email = `Please keep your email address to ${EMAIL_MAX} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  const message = draft.message.trim();
  if (message.length < MESSAGE_MIN) {
    errors.message = `Please write at least ${MESSAGE_MIN} characters.`;
  } else if (message.length > MESSAGE_MAX) {
    errors.message = `Please keep your message to ${MESSAGE_MAX} characters or fewer.`;
  }

  if (typeof draft.startedAt !== 'number' || !Number.isFinite(draft.startedAt) || draft.startedAt <= 0) {
    errors.startedAt = 'The form could not be initialised. Please reload the page and try again.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      message,
      website: draft.website ?? '',
      startedAt: draft.startedAt as number,
    },
  };
}

/**
 * Submit a contact payload. Resolves only on HTTP 201 whose JSON body is an
 * object with `ok === true`; every other outcome — a non-201 status, a body
 * that is not JSON, a body that is not a JSON object, or an object without
 * `ok: true` — rejects with a `ContactRequestError`.
 */
export async function postContact(
  payload: ContactPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let response: Response;

  try {
    response = await fetchImpl(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ContactRequestError(0, 'The contact endpoint could not be reached.');
  }

  if (response.status === 201) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ContactRequestError(
        response.status,
        'The contact endpoint did not answer with a JSON body.',
      );
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new ContactRequestError(
        response.status,
        'The contact endpoint did not answer with a JSON object.',
      );
    }

    const ok = (body as { ok?: unknown }).ok;
    if (ok !== true) {
      throw new ContactRequestError(
        response.status,
        'The contact endpoint did not accept the submission.',
      );
    }

    return;
  }

  throw new ContactRequestError(response.status, `The contact endpoint answered with status ${response.status}.`);
}
