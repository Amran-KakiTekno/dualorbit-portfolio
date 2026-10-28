import { describe, expect, it, vi } from 'vitest';
import {
  CONTACT_ENDPOINT,
  ContactRequestError,
  postContact,
  validateContactDraft,
  type ContactDraft,
  type ContactPayload,
} from '../../src/contact';

function draft(overrides: Partial<ContactDraft> = {}): ContactDraft {
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'We need a governed pipeline for our operational sources.',
    website: '',
    startedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

/** A response whose body is not JSON at all. */
function mockFetchWithNonJsonBody(status: number) {
  return vi.fn(async () => ({
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    },
  })) as unknown as typeof fetch;
}

describe('validateContactDraft', () => {
  it('accepts a complete draft and trims the visible fields', () => {
    const result = validateContactDraft(
      draft({ name: '  Ada Lovelace  ', email: ' ada@example.com ', message: '  hello there, this is a message  ' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Ada Lovelace');
      expect(result.value.email).toBe('ada@example.com');
      expect(result.value.message).toBe('hello there, this is a message');
    }
  });

  it('enforces the name length boundaries of 2 and 80 characters', () => {
    expect(validateContactDraft(draft({ name: 'A' })).ok).toBe(false);
    expect(validateContactDraft(draft({ name: 'Al' })).ok).toBe(true);
    expect(validateContactDraft(draft({ name: 'x'.repeat(80) })).ok).toBe(true);
    expect(validateContactDraft(draft({ name: 'x'.repeat(81) })).ok).toBe(false);
  });

  it('enforces the email length and shape boundaries', () => {
    expect(validateContactDraft(draft({ email: 'a@b' })).ok).toBe(false);
    expect(validateContactDraft(draft({ email: 'a@b.co' })).ok).toBe(true);
    expect(validateContactDraft(draft({ email: `${'x'.repeat(242)}@example.com` })).ok).toBe(true);
    expect(validateContactDraft(draft({ email: `${'x'.repeat(243)}@example.com` })).ok).toBe(false);
    expect(validateContactDraft(draft({ email: 'two@@example.com' })).ok).toBe(false);
    expect(validateContactDraft(draft({ email: 'no-at-sign.example.com' })).ok).toBe(false);
  });

  it('enforces the message length boundaries of 10 and 2000 characters', () => {
    expect(validateContactDraft(draft({ message: 'x'.repeat(9) })).ok).toBe(false);
    expect(validateContactDraft(draft({ message: 'x'.repeat(10) })).ok).toBe(true);
    expect(validateContactDraft(draft({ message: 'x'.repeat(2000) })).ok).toBe(true);
    expect(validateContactDraft(draft({ message: 'x'.repeat(2001) })).ok).toBe(false);
  });

  it('requires a usable startedAt value', () => {
    expect(validateContactDraft(draft({ startedAt: null })).ok).toBe(false);
    expect(validateContactDraft(draft({ startedAt: 0 })).ok).toBe(false);
    expect(validateContactDraft(draft({ startedAt: Number.NaN })).ok).toBe(false);
    expect(validateContactDraft(draft({ startedAt: 1_700_000_000_000 })).ok).toBe(true);
  });

  it('reports every offending field at once', () => {
    const result = validateContactDraft(draft({ name: '', email: 'nope', message: 'short' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['email', 'message', 'name']);
    }
  });

  it('carries the honeypot value through without failing validation', () => {
    const result = validateContactDraft(draft({ website: 'https://spam.example' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.website).toBe('https://spam.example');
    }
  });
});

describe('postContact', () => {
  const payload: ContactPayload = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'We need a governed pipeline for our operational sources.',
    website: '',
    startedAt: 1_700_000_000_000,
  };

  it('posts JSON to the same-origin contact endpoint with all five fields', async () => {
    const fetchMock = mockFetch(201, { ok: true });

    await postContact(payload, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(CONTACT_ENDPOINT);
    expect(url).toBe('/api/contact');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(['email', 'message', 'name', 'startedAt', 'website']);
    expect(typeof body.startedAt).toBe('number');
    expect(body.startedAt).toBe(payload.startedAt);
  });

  it('resolves on HTTP 201 with ok true', async () => {
    const fetchMock = mockFetch(201, { ok: true });
    await expect(postContact(payload, fetchMock)).resolves.toBeUndefined();
  });

  it('rejects when the endpoint answers 201 without ok true', async () => {
    const fetchMock = mockFetch(201, { ok: false });
    await expect(postContact(payload, fetchMock)).rejects.toBeInstanceOf(ContactRequestError);
  });

  it('rejects a 201 whose body is an empty object', async () => {
    const fetchMock = mockFetch(201, {});
    await expect(postContact(payload, fetchMock)).rejects.toMatchObject({
      name: 'ContactRequestError',
      status: 201,
    });
  });

  it('rejects a 201 whose body is null', async () => {
    const fetchMock = mockFetch(201, null);
    await expect(postContact(payload, fetchMock)).rejects.toMatchObject({
      name: 'ContactRequestError',
      status: 201,
    });
  });

  it('rejects a 201 whose body is not a JSON object', async () => {
    for (const body of ['accepted', 201, true]) {
      const fetchMock = mockFetch(201, body);
      await expect(postContact(payload, fetchMock)).rejects.toBeInstanceOf(ContactRequestError);
    }
  });

  it('rejects a 201 whose body is a JSON array', async () => {
    const fetchMock = mockFetch(201, [{ ok: true }]);
    await expect(postContact(payload, fetchMock)).rejects.toBeInstanceOf(ContactRequestError);
  });

  it('rejects a 201 whose body is not JSON at all', async () => {
    const fetchMock = mockFetchWithNonJsonBody(201);
    await expect(postContact(payload, fetchMock)).rejects.toMatchObject({
      name: 'ContactRequestError',
      status: 201,
    });
  });

  it('rejects on HTTP 500 and reports the status', async () => {
    const fetchMock = mockFetch(500, { ok: false, error: 'storage failure' });
    await expect(postContact(payload, fetchMock)).rejects.toMatchObject({
      name: 'ContactRequestError',
      status: 500,
    });
  });

  it('rejects on HTTP 400 and reports the status', async () => {
    const fetchMock = mockFetch(400, { ok: false, error: 'invalid' });
    await expect(postContact(payload, fetchMock)).rejects.toMatchObject({ status: 400 });
  });

  it('rejects when the request cannot reach the endpoint', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(postContact(payload, fetchMock)).rejects.toMatchObject({ status: 0 });
  });
});
