import type { Sql } from 'postgres';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryDeadlineError, withQueryDeadline } from './query-deadline';

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
