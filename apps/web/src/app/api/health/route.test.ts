import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.fn();
const captureException = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  captureException: (...args: unknown[]) => captureException(...args),
}));

/**
 * The query the probe dispatches. `@/lib/db` is replaced wholesale — importing
 * it would build a real pool — but `pingDatabase` keeps the real probe logic,
 * so the timeout and cancel behaviour exercised here is the shipped one.
 */
const dispatchQuery = vi.fn();

vi.mock('@/lib/db', async () => {
  const { probeDatabase } = await import('@/lib/db/health-probe');
  return {
    pingDatabase: (timeoutMs: number) => probeDatabase(() => dispatchQuery(), timeoutMs),
  };
});

const { GET, dynamic } = await import('./route');

type FakeQuery = Promise<unknown> & { cancel: ReturnType<typeof vi.fn> };

function fakeQuery(executor: ConstructorParameters<typeof Promise<unknown>>[0]): FakeQuery {
  return Object.assign(new Promise<unknown>(executor), { cancel: vi.fn() });
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dispatchQuery.mockReset();
    captureMessage.mockClear();
    captureException.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is opted out of static rendering', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('returns 200 ok when the database answers', async () => {
    dispatchQuery.mockReturnValue(fakeQuery((resolve) => resolve([{ '?column?': 1 }])));

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(dispatchQuery).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without the error detail when the query fails', async () => {
    dispatchQuery.mockReturnValue(
      fakeQuery((_, reject) =>
        reject(new Error('EMAXCONNSESSION max clients reached at db.internal.example:5432'))
      )
    );

    const res = await GET();

    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: 'unavailable' });
    expect(text).not.toContain('EMAXCONN');
    expect(text).not.toContain('db.internal.example');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 503 and cancels the query when the database does not answer in time', async () => {
    const hung = fakeQuery(() => {});
    dispatchQuery.mockReturnValue(hung);

    const pending = GET();
    await vi.advanceTimersByTimeAsync(3_000);
    const res = await pending;

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'unavailable' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(hung.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not send a Sentry event per failed probe', async () => {
    dispatchQuery.mockReturnValue(fakeQuery((_, reject) => reject(new Error('down'))));

    await GET();
    await GET();

    expect(captureMessage).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });
});
