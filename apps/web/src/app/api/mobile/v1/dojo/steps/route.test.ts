import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const authorizeMobileRequest = vi.fn();
vi.mock('@/lib/mobile-api/auth', () => ({
  authorizeMobileRequest: (...args: unknown[]) => authorizeMobileRequest(...args),
}));
vi.mock('server-only', () => ({}));

// The route reads `RATE_LIMITS` from the real module; importing it loads
// `@/lib/db`, so the database is stubbed as well.
const insertValues = vi.fn();
const storedKeys = new Set<string>();
vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: (rows: { stepKey: string }[]) => {
        insertValues(rows);
        return {
          onConflictDoNothing: () => {
            for (const row of rows) storedKeys.add(row.stepKey);
          },
        };
      },
    }),
  },
  dojoStepCompletions: { userId: 'user_id', stepKey: 'step_key' },
}));
vi.mock('@/lib/security/rate-limit', async (importActual) => importActual());

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/mobile/v1/dojo/steps', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

describe('POST /api/mobile/v1/dojo/steps', () => {
  beforeEach(() => {
    insertValues.mockReset();
    storedKeys.clear();
    authorizeMobileRequest.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1' } });
  });

  it('records guide keys for the token user and answers them as completed', async () => {
    const response = await post({ steps: ['guide:5kyu:1', 'guide:5kyu:2'] });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      completed: ['guide:5kyu:1', 'guide:5kyu:2'],
      rejected: [],
    });
    expect(insertValues).toHaveBeenCalledWith([
      { userId: 'u1', stepKey: 'guide:5kyu:1' },
      { userId: 'u1', stepKey: 'guide:5kyu:2' },
    ]);
  });

  it('rejects every key that is not a guide key, exam keys included', async () => {
    const response = await post({
      steps: ['exam:2kyu:puzzle', 'exam:2kyu:position_memory', 'bogus', 'guide:2kyu:1'],
    });

    expect(await response.json()).toEqual({
      completed: ['guide:2kyu:1'],
      rejected: ['exam:2kyu:puzzle', 'exam:2kyu:position_memory', 'bogus'],
    });
    expect([...storedKeys]).toEqual(['guide:2kyu:1']);
  });

  it('answers a resend the same way and stores nothing new (idempotent)', async () => {
    const first = await (await post({ steps: ['guide:3kyu:1'] })).json();
    const second = await (await post({ steps: ['guide:3kyu:1'] })).json();

    expect(second).toEqual(first);
    expect(second).toEqual({ completed: ['guide:3kyu:1'], rejected: [] });
    expect([...storedKeys]).toEqual(['guide:3kyu:1']);
  });

  it('takes the user from the token, ignoring any userId in the body', async () => {
    await post({ steps: ['guide:5kyu:1'], userId: 'someone-else' });

    expect(insertValues).toHaveBeenCalledWith([{ userId: 'u1', stepKey: 'guide:5kyu:1' }]);
  });

  it('accepts exactly 100 keys', async () => {
    const steps = Array.from({ length: 100 }, (_, i) => `guide:5kyu:${(i % 50) + 1}`);

    expect((await post({ steps })).status).toBe(200);
  });

  it('answers 400 invalidRequest for 101 keys', async () => {
    const steps = Array.from({ length: 101 }, () => 'guide:5kyu:1');
    const response = await post({ steps });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalidRequest' });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('answers 400 invalidRequest for an empty list, a non-array or a missing body', async () => {
    expect((await post({ steps: [] })).status).toBe(400);
    expect((await post({ steps: 'guide:5kyu:1' })).status).toBe(400);
    expect((await post(null)).status).toBe(400);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('passes the auth failure through untouched', async () => {
    authorizeMobileRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    });

    expect((await post({ steps: ['guide:5kyu:1'] })).status).toBe(401);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('rate limits with the dojoStep budget', async () => {
    await post({ steps: ['guide:5kyu:1'] });

    expect(authorizeMobileRequest).toHaveBeenCalledWith(expect.any(Request), {
      rateLimit: expect.objectContaining({ action: 'dojo_step', maxAttempts: 120 }),
    });
  });
});
