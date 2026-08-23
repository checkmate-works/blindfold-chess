import type { Sql } from 'postgres';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  QueryDeadlineError,
  isPoolerAtCapacity,
  resetInflightRegistryForTests,
  setCapacityRetry,
  setDeadlineRetry,
  setQueryActivityHandler,
  setWedgedQueryHandler,
  withQueryDeadline,
} from './query-deadline';

/**
 * Stand-in for postgres.js's `Query`: a Promise subclass that `values()` and
 * friends mutate and return `this` from, plus a `cancel()`.
 */
class FakeQuery extends Promise<unknown> {
  cancel = vi.fn();
  string = 'select 1';
  isRaw: string | boolean = false;

  values() {
    this.isRaw = 'values';
    return this;
  }

  raw() {
    this.isRaw = true;
    return this;
  }
}

function neverSettles(): FakeQuery {
  return new FakeQuery(() => {});
}

function resolvesWith(value: unknown): FakeQuery {
  return new FakeQuery((resolve) => resolve(value));
}

function fakeClient(overrides: Partial<Record<string, unknown>> = {}): Sql {
  const client = ((..._args: unknown[]) => neverSettles()) as unknown as Record<string, unknown>;
  client.unsafe = vi.fn(() => neverSettles());
  client.begin = vi.fn();
  client.end = vi.fn();
  Object.assign(client, overrides);
  return client as unknown as Sql;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetInflightRegistryForTests();
  setWedgedQueryHandler(undefined);
  setQueryActivityHandler(undefined);
  setDeadlineRetry(undefined);
  setCapacityRetry(undefined);
});

/** The refusal Supavisor sends once its session-mode client budget is full. */
function poolerFullError(): Error {
  return new Error(
    '(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 30'
  );
}

function rejectsWith(error: Error): FakeQuery {
  const q = new FakeQuery((_resolve, rejectQuery) => rejectQuery(error));
  // The rejection is handled by the wrapper, not by this reference.
  q.catch(() => {});
  return q;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('withQueryDeadline', () => {
  it('rejects a query that never answers, naming the SQL', async () => {
    const db = withQueryDeadline(fakeClient());

    const pending = expect(db.unsafe('select * from profiles')).rejects.toBeInstanceOf(
      QueryDeadlineError
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
  });

  it('attaches where-did-the-time-go diagnostics to the rejection', async () => {
    const db = withQueryDeadline(fakeClient());

    const settled = (db.unsafe('select 1') as Promise<unknown>).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_000);
    const error = (await settled) as QueryDeadlineError;

    expect(error).toBeInstanceOf(QueryDeadlineError);
    expect(error.message).toContain('timer overshoot');
    // Fake timers advance the clock without advancing performance.now(), so
    // the measured overshoot clamps to zero.
    expect(error.diagnostics.overshootMs).toBe(0);
    expect(error.diagnostics.inflightCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(error.diagnostics.inflightOldest)).toBe(true);
  });

  it('lists other unsettled queries in the diagnostics, oldest first', async () => {
    const wedged = neverSettles();
    wedged.string = 'select pg_sleep(3600)';
    const victim = neverSettles();
    victim.string = 'select 1';
    const queries = [wedged, victim];
    const db = withQueryDeadline(fakeClient({ unsafe: () => queries.shift() }));

    // The wedged query is subscribed first, times out, and its awaiter walks
    // away — but it never settles, so it must stay visible to later victims.
    const wedgedSettled = (db.unsafe('a') as Promise<unknown>).catch(() => {});
    const victimSettled = (db.unsafe('b') as Promise<unknown>).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_000);
    await wedgedSettled;
    const error = (await victimSettled) as QueryDeadlineError;

    expect(error).toBeInstanceOf(QueryDeadlineError);
    expect(error.diagnostics.inflightCount).toBe(1);
    expect(error.diagnostics.inflightOldest[0]).toMatchObject({
      sql: 'select pg_sleep(3600)',
      deadlined: true,
    });
  });

  it('cancels the query server-side when the deadline passes', async () => {
    const query = neverSettles();
    const db = withQueryDeadline(fakeClient({ unsafe: () => query }));

    const pending = db.unsafe('select 1').catch(() => {});
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;

    expect(query.cancel).toHaveBeenCalledTimes(1);
  });

  it('passes a query that answers in time straight through', async () => {
    const db = withQueryDeadline(fakeClient({ unsafe: () => resolvesWith([{ id: 1 }]) }));

    await expect(db.unsafe('select 1')).resolves.toEqual([{ id: 1 }]);
  });

  it('keeps the deadline across `.values()`, which drizzle chains', async () => {
    const query = neverSettles();
    const db = withQueryDeadline(fakeClient({ unsafe: () => query }));

    const chained = db.unsafe('select 1').values();
    const pending = expect(chained).rejects.toBeInstanceOf(QueryDeadlineError);
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;

    // The chained call still reached the underlying query.
    expect(query.isRaw).toBe('values');
  });

  it('arms exactly one timer however often the query is awaited', async () => {
    const query = neverSettles();
    const db = withQueryDeadline(fakeClient({ unsafe: () => query }));

    const wrapped = db.unsafe('select 1');
    const first = wrapped.catch(() => 'first');
    const second = wrapped.catch(() => 'second');
    await vi.advanceTimersByTimeAsync(10_000);
    await Promise.all([first, second]);

    expect(query.cancel).toHaveBeenCalledTimes(1);
  });

  it('declares a query wedged when it stays unsettled past the grace period', async () => {
    const handler = vi.fn();
    setWedgedQueryHandler(handler);
    const db = withQueryDeadline(fakeClient());

    const settled = (db.unsafe('select 1') as Promise<unknown>).catch(() => {});
    await vi.advanceTimersByTimeAsync(10_000);
    await settled;
    // The awaiter has its rejection, but the query itself never settled.
    expect(handler).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ sql: 'select 1' });
  });

  it('reports activity on dispatch and again on settlement', async () => {
    const activity = vi.fn();
    setQueryActivityHandler(activity);
    const db = withQueryDeadline(fakeClient({ unsafe: () => resolvesWith([{ id: 1 }]) }));

    // A query only dispatches when first awaited — subscribe to trigger it.
    const pending = (db.unsafe('select 1') as Promise<unknown>).then((rows) => rows);
    expect(activity).toHaveBeenCalledTimes(1); // dispatch
    expect(activity).toHaveBeenLastCalledWith({ inflightCount: 1 });

    await pending;
    expect(activity).toHaveBeenCalledTimes(2); // settlement
    expect(activity).toHaveBeenLastCalledWith({ inflightCount: 0 });
  });

  it('counts every query still in flight at the moment of each event', async () => {
    const activity = vi.fn();
    setQueryActivityHandler(activity);
    const answers: Array<(value: unknown) => void> = [];
    const db = withQueryDeadline(
      fakeClient({ unsafe: () => new FakeQuery((resolve) => answers.push(resolve)) })
    );

    const a = (db.unsafe('select 1') as Promise<unknown>).then((rows) => rows);
    const b = (db.unsafe('select 2') as Promise<unknown>).then((rows) => rows);
    expect(activity).toHaveBeenNthCalledWith(1, { inflightCount: 1 });
    expect(activity).toHaveBeenNthCalledWith(2, { inflightCount: 2 });

    answers[0]!([]);
    await a;
    expect(activity).toHaveBeenNthCalledWith(3, { inflightCount: 1 }); // one still pending

    answers[1]!([]);
    await b;
    expect(activity).toHaveBeenNthCalledWith(4, { inflightCount: 0 }); // pool quiet
  });

  it('reports dispatch activity even for a query that never settles', async () => {
    const activity = vi.fn();
    setQueryActivityHandler(activity);
    const db = withQueryDeadline(fakeClient());

    const settled = (db.unsafe('select 1') as Promise<unknown>).catch(() => {});
    expect(activity).toHaveBeenCalledTimes(1); // dispatch, and never again:
    await vi.advanceTimersByTimeAsync(15_000);
    await settled;
    expect(activity).toHaveBeenCalledTimes(1); // the deadline rejection is not a settlement
  });

  it('does not flag a query whose late answer arrives within the grace period', async () => {
    const handler = vi.fn();
    setWedgedQueryHandler(handler);
    let answerLate!: (value: unknown) => void;
    const query = new FakeQuery((resolve) => {
      answerLate = resolve;
    });
    const db = withQueryDeadline(fakeClient({ unsafe: () => query }));

    const settled = (db.unsafe('select 1') as Promise<unknown>).catch(() => {});
    await vi.advanceTimersByTimeAsync(10_000);
    await settled;

    answerLate([{ id: 1 }]);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(handler).not.toHaveBeenCalled();
  });

  describe('deadline retry', () => {
    it('rescues a deadlined select with the retry result, transparently', async () => {
      const retryQuery = resolvesWith([{ count: 42 }]);
      const dispatch = vi.fn(() => retryQuery);
      const report = vi.fn();
      setDeadlineRetry({ dispatch, report });
      const db = withQueryDeadline(fakeClient({ unsafe: () => neverSettles() }));

      const pending = db.unsafe('select count(*) from x', ['p1']) as Promise<unknown>;
      const result = pending.then((rows) => rows);
      await vi.advanceTimersByTimeAsync(10_000);

      await expect(result).resolves.toEqual([{ count: 42 }]);
      expect(dispatch).toHaveBeenCalledWith(['select count(*) from x', ['p1']]);
      expect(report).toHaveBeenCalledWith('rescued', 'select 1', expect.any(Number));
    });

    it('rejects with the ORIGINAL deadline error when the retry also never answers', async () => {
      const retryQuery = neverSettles();
      setDeadlineRetry({ dispatch: () => retryQuery, report: vi.fn() });
      const db = withQueryDeadline(fakeClient());

      const settled = expect(db.unsafe('select 1') as Promise<unknown>).rejects.toBeInstanceOf(
        QueryDeadlineError
      );
      await vi.advanceTimersByTimeAsync(20_000);
      await settled;

      expect(retryQuery.cancel).toHaveBeenCalledTimes(1);
    });

    it('rejects with the original deadline error when the retry itself rejects', async () => {
      const retryQuery = new FakeQuery((_resolve, reject) =>
        reject(new Error('CONNECTION_DESTROYED'))
      );
      // Mark handled: nothing subscribes until the deadline dispatches it.
      retryQuery.catch(() => {});
      const report = vi.fn();
      setDeadlineRetry({ dispatch: () => retryQuery, report });
      const db = withQueryDeadline(fakeClient());

      const settled = expect(db.unsafe('select 1') as Promise<unknown>).rejects.toBeInstanceOf(
        QueryDeadlineError
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await settled;

      expect(report).toHaveBeenCalledWith('failed', 'select 1', expect.any(Number));
    });

    it('never retries a write', async () => {
      const dispatch = vi.fn();
      setDeadlineRetry({ dispatch, report: vi.fn() });
      const db = withQueryDeadline(fakeClient());

      const settled = expect(
        db.unsafe('insert into x values (1)') as Promise<unknown>
      ).rejects.toBeInstanceOf(QueryDeadlineError);
      await vi.advanceTimersByTimeAsync(10_000);
      await settled;

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('never retries inside a transaction', async () => {
      const dispatch = vi.fn();
      setDeadlineRetry({ dispatch, report: vi.fn() });
      let innerPromise!: Promise<unknown>;
      const begin = vi.fn((callback: (tx: Sql) => unknown) => {
        const inner = fakeClient();
        return Promise.resolve(callback(inner));
      });
      const db = withQueryDeadline(fakeClient({ begin }));

      await db.begin(async (tx) => {
        innerPromise = expect(tx.unsafe('select 1') as Promise<unknown>).rejects.toBeInstanceOf(
          QueryDeadlineError
        );
        await vi.advanceTimersByTimeAsync(10_000);
        await innerPromise;
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('replays chained `.values()` onto the retry query', async () => {
      const retryQuery = resolvesWith([['a']]);
      setDeadlineRetry({ dispatch: () => retryQuery, report: vi.fn() });
      const db = withQueryDeadline(fakeClient({ unsafe: () => neverSettles() }));

      const wrapped = db.unsafe('select 1') as unknown as FakeQuery;
      const result = wrapped.values().then((rows: unknown) => rows);
      await vi.advanceTimersByTimeAsync(10_000);

      await expect(result).resolves.toEqual([['a']]);
      expect(retryQuery.isRaw).toBe('values');
    });

    it('still lets a genuinely late original answer win before the retry settles', async () => {
      let answerLate!: (value: unknown) => void;
      const original = new FakeQuery((resolve) => {
        answerLate = resolve;
      });
      const retryQuery = neverSettles();
      setDeadlineRetry({ dispatch: () => retryQuery, report: vi.fn() });
      const db = withQueryDeadline(fakeClient({ unsafe: () => original }));

      const result = (db.unsafe('select 1') as Promise<unknown>).then((rows) => rows);
      await vi.advanceTimersByTimeAsync(12_000);
      answerLate([{ id: 7 }]);

      await expect(result).resolves.toEqual([{ id: 7 }]);
    });
  });

  it('gives the transaction client a deadline too', async () => {
    const query = neverSettles();
    const transactionClient = fakeClient({ unsafe: () => query });
    const db = withQueryDeadline(
      fakeClient({
        begin: (callback: (sql: Sql) => unknown) => callback(transactionClient),
      })
    );

    const pending = (
      db.begin(async (tx) => tx.unsafe('insert into x values (1)')) as Promise<unknown>
    ).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toBeInstanceOf(QueryDeadlineError);
  });

  it('leaves non-query members of the client alone', () => {
    const end = vi.fn();
    const db = withQueryDeadline(fakeClient({ end }));

    db.end();

    expect(end).toHaveBeenCalledTimes(1);
  });
});

describe('pooler-at-capacity retry', () => {
  it('recognises both pooler wordings and nothing else', () => {
    expect(isPoolerAtCapacity(poolerFullError())).toBe(true);
    expect(isPoolerAtCapacity(new Error('max client connections reached, limit: 200'))).toBe(true);
    expect(isPoolerAtCapacity(new Error('Tenant or user not found'))).toBe(false);
    expect(isPoolerAtCapacity(new Error('duplicate key value violates unique constraint'))).toBe(
      false
    );
    expect(isPoolerAtCapacity(undefined)).toBe(false);
  });

  it('waits out a full pooler and resolves the caller transparently', async () => {
    const queries = [rejectsWith(poolerFullError()), resolvesWith([{ id: 1 }])];
    const db = withQueryDeadline(fakeClient({ unsafe: () => queries.shift() }));
    const report = vi.fn();
    setCapacityRetry({ dispatch: () => queries.shift(), report });

    // Subscribing is what dispatches the query, so it must precede the clock.
    const settled = (db.unsafe('insert into likes values (1)') as Promise<unknown>).then((r) => r);
    await vi.advanceTimersByTimeAsync(400);

    await expect(settled).resolves.toEqual([{ id: 1 }]);
    expect(report).toHaveBeenCalledWith('rescued', expect.any(String), 1, expect.any(Number));
  });

  it('re-issues writes, which the deadline retry must never do', async () => {
    const queries = [rejectsWith(poolerFullError()), resolvesWith([])];
    const db = withQueryDeadline(fakeClient({ unsafe: () => queries.shift() }));
    const dispatch = vi.fn(() => queries.shift());
    setCapacityRetry({ dispatch, report: vi.fn() });

    const settled = (
      db.unsafe('update profiles set display_name = $1', ['x']) as Promise<unknown>
    ).then((r) => r);
    await vi.advanceTimersByTimeAsync(400);
    await settled;

    expect(dispatch).toHaveBeenCalledWith(['update profiles set display_name = $1', ['x']]);
  });

  it('gives up after the backoff list and reports the original refusal', async () => {
    const alwaysFull = () => rejectsWith(poolerFullError());
    const db = withQueryDeadline(fakeClient({ unsafe: alwaysFull }));
    const report = vi.fn();
    setCapacityRetry({ dispatch: alwaysFull, report });

    const settled = (db.unsafe('select 1') as Promise<unknown>).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(2_000);
    const error = (await settled) as Error;

    expect(error.message).toContain('EMAXCONNSESSION');
    expect(report).toHaveBeenCalledWith('failed', expect.any(String), 2, expect.any(Number));
  });

  it('abandons a hung attempt: cancels it, fails the caller, never reports rescued', async () => {
    const hungAttempt = neverSettles();
    const queries = [rejectsWith(poolerFullError())];
    const db = withQueryDeadline(fakeClient({ unsafe: () => queries.shift() }));
    const report = vi.fn();
    setCapacityRetry({ dispatch: () => hungAttempt, report });

    const settled = (db.unsafe('select 1') as Promise<unknown>).catch((e: unknown) => e);
    // Backoff (≤300ms jittered) + the 2s attempt timeout, well before the 10s
    // deadline — the caller must be answered by the attempt timer, not by the
    // original query's deadline path.
    await vi.advanceTimersByTimeAsync(3_000);
    const error = (await settled) as Error;

    expect(error.message).toContain('EMAXCONNSESSION');
    expect(hungAttempt.cancel).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith('failed', expect.any(String), 1, expect.any(Number));
  });

  it('hands back a non-capacity error from a retry instead of masking it', async () => {
    const queries = [rejectsWith(poolerFullError()), rejectsWith(new Error('syntax error'))];
    const db = withQueryDeadline(fakeClient({ unsafe: () => queries.shift() }));
    setCapacityRetry({ dispatch: () => queries.shift(), report: vi.fn() });

    const settled = (db.unsafe('select bogus') as Promise<unknown>).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(400);

    expect((await settled) as Error).toHaveProperty('message', 'syntax error');
  });

  it('leaves ordinary query errors alone', async () => {
    const db = withQueryDeadline(fakeClient({ unsafe: () => rejectsWith(new Error('boom')) }));
    const dispatch = vi.fn();
    setCapacityRetry({ dispatch, report: vi.fn() });

    await expect(db.unsafe('select 1')).rejects.toThrow('boom');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
