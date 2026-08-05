import type { Sql } from 'postgres';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  QueryDeadlineError,
  resetInflightRegistryForTests,
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
});

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
    // the measured overshoot clamps to zero; the loop stats are real readings.
    expect(error.diagnostics.overshootMs).toBe(0);
    const { inflightOldest, ...numericDiagnostics } = error.diagnostics;
    for (const value of Object.values(numericDiagnostics)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(Array.isArray(inflightOldest)).toBe(true);
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
