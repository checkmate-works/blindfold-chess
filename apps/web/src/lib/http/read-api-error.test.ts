import { describe, expect, it } from 'vitest';

import { readApiError } from './read-api-error';

describe('readApiError', () => {
  it('returns a string error code', async () => {
    await expect(readApiError(Response.json({ error: 'invalid_file' }))).resolves.toBe(
      'invalid_file'
    );
  });

  it.each([
    ['invalid JSON', new Response('not json')],
    ['a missing error field', Response.json({ message: 'failed' })],
    ['a non-string error field', Response.json({ error: 42 })],
  ])('returns undefined for %s', async (_description, response) => {
    await expect(readApiError(response)).resolves.toBeUndefined();
  });
});
