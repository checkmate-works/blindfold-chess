import { describe, expect, it } from 'vitest';

import { readApiError } from './read-api-error';

describe('readApiError', () => {
  it('returns a string error code', async () => {
    await expect(readApiError(Response.json({ error: 'invalid_file' }))).resolves.toBe(
      'invalid_file'
    );
  });

  it.each([
    ['invalid JSON', () => new Response('not json')],
    // What a platform-level 502 / gateway timeout actually returns: the
    // upstream never ran, so the body is the proxy's own HTML page.
    [
      'an HTML error page',
      () =>
        new Response('<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
    ],
    ['an empty body', () => new Response(null, { status: 500 })],
    ['a missing error field', () => Response.json({ message: 'failed' })],
    ['a non-string error field', () => Response.json({ error: 42 })],
    ['a JSON null body', () => Response.json(null)],
    ['a JSON array body', () => Response.json(['error'])],
  ])('returns undefined for %s', async (_description, makeResponse) => {
    await expect(readApiError(makeResponse())).resolves.toBeUndefined();
  });

  it('returns undefined when the body stream rejects mid-read', async () => {
    // A connection dropped after the headers arrived: the response is a
    // perfectly ordinary one until the body is pulled, and only then fails.
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"error":"parti'));
        controller.error(new TypeError('network error'));
      },
    });

    await expect(readApiError(new Response(body, { status: 500 }))).resolves.toBeUndefined();
  });
});
