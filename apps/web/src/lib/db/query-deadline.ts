import type { Sql } from 'postgres';

/**
 * How long a single query may take before it is abandoned.
 *
 * Every interactive query in this app is sub-second, so ten seconds is far
 * outside normal and still six times below the routes' `maxDuration = 60`,
 * leaving room for the failure to render an error and reach Sentry. The
 * trade-off is deliberate: a report-style query that legitimately needed more
 * than ten seconds would now fail, and should be made faster or given its own
 * budget rather than raising this for everything.
 */
const QUERY_DEADLINE_MS = 10_000;

/** How much of the SQL to keep in the error message. Enough to identify it. */
const SQL_EXCERPT_LENGTH = 300;

/**
 * Thrown when a query passes {@link QUERY_DEADLINE_MS}. Carries the SQL — but
 * never the parameters, which hold user data.
 */
export class QueryDeadlineError extends Error {
  readonly sql: string;

  constructor(sql: string) {
    super(`Query exceeded the ${QUERY_DEADLINE_MS}ms deadline: ${sql}`);
    this.name = 'QueryDeadlineError';
    this.sql = sql;
  }
}

/** Methods postgres.js mutates and returns `this` from, so the wrapper survives them. */
const CHAINABLE = new Set(['values', 'raw', 'execute']);

type PendingQuery = PromiseLike<unknown> & {
  cancel: () => void;
  strings?: readonly string[];
  string?: string;
};

function describeSql(query: PendingQuery, fallback: string): string {
  const text = query.string ?? query.strings?.join('?') ?? fallback;
  return text.length > SQL_EXCERPT_LENGTH ? `${text.slice(0, SQL_EXCERPT_LENGTH)}…` : text;
}

/**
 * Wrap one pending query so awaiting it rejects at the deadline.
 *
 * The race is built once and memoized: postgres.js only starts the query when
 * something reads `then`, and two races would mean two timers on one query.
 */
function wrapQuery<T extends PendingQuery>(query: T, fallbackSql: string): T {
  let raced: Promise<unknown> | undefined;

  const race = () => {
    if (!raced) {
      let timer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          // Ask the server to abort too, so a query that IS running does not
          // outlive the request that wanted it. Cancelling can throw when the
          // connection is already gone — which is the case we are here for.
          try {
            query.cancel();
          } catch {
            // Nothing to cancel; the rejection below is what matters.
          }
          reject(new QueryDeadlineError(describeSql(query, fallbackSql)));
        }, QUERY_DEADLINE_MS);
      });
      raced = Promise.race([query, deadline]).finally(() => clearTimeout(timer));
    }
    return raced;
  };

  const proxy = new Proxy(query, {
    get(target, property, receiver) {
      if (property === 'then' || property === 'catch' || property === 'finally') {
        const promise = race();
        return promise[property].bind(promise);
      }
      if (typeof property === 'string' && CHAINABLE.has(property)) {
        return (...args: unknown[]) => {
          (target[property as keyof PendingQuery] as (...a: unknown[]) => unknown)(...args);
          return proxy;
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  return proxy;
}

/** Whether a value looks like a pending postgres.js query. */
function isPendingQuery(value: unknown): value is PendingQuery {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PendingQuery).then === 'function' &&
    typeof (value as PendingQuery).cancel === 'function'
  );
}

/**
 * Give every query issued through `client` a client-side deadline.
 *
 * @design Why this exists at all
 * postgres.js has no timeout for a query once it has been dispatched — the
 * option surface is `connect_timeout` (the connect phase), `idle_timeout` and
 * `max_lifetime` (recycling idle connections), and `keep_alive` (TCP
 * keepalive). Nothing bounds a query that has been written to a socket and
 * never answered.
 *
 * The `statement_timeout` set in `./index.ts` does not close that gap: it is a
 * server-side setting that only starts counting once the backend begins
 * executing. A query waiting in the client's own queue, or sitting on a
 * half-open socket, or queued inside the transaction pooler for a backend, has
 * not started — so it can wait forever without ever raising SQLSTATE 57014.
 *
 * That is the shape production kept hitting: a render that never finished, no
 * DB error, no auth error, killed at `maxDuration` with nothing to show for
 * it. See the navigation-stall entry in CLAUDE.md's Known Issues. This wrapper
 * turns that silence into a named error that identifies the query.
 *
 * In Sentry the failure arrives as Drizzle's `Failed query: <sql>` with the
 * {@link QueryDeadlineError} as its `cause` — look at the linked exception to
 * tell a deadline apart from an ordinary query error.
 *
 * @design Where it hooks in
 * Drizzle issues every statement through `client.unsafe(...)`, chaining
 * `.values()` for some, and opens transactions through `client.begin(...)`.
 * Wrapping those — plus the tagged-template call itself, and the nested client
 * handed to a transaction callback — covers every path into the driver. A
 * shape that somehow slipped past would simply not get a deadline, which is
 * the behaviour that existed before this wrapper.
 */
export function withQueryDeadline(client: Sql): Sql {
  const wrapClient = (target: Sql): Sql =>
    new Proxy(target, {
      // The client is itself callable, as the sql`...` tag.
      apply(fn, thisArg, args: unknown[]) {
        const result = Reflect.apply(fn as unknown as (...a: unknown[]) => unknown, thisArg, args);
        return isPendingQuery(result) ? wrapQuery(result, String(args[0])) : result;
      },
      get(sql, property, receiver) {
        if (property === 'unsafe') {
          return (...args: unknown[]) => {
            const query = (sql.unsafe as (...a: unknown[]) => unknown)(...args);
            return isPendingQuery(query) ? wrapQuery(query, String(args[0])) : query;
          };
        }

        // Queries inside a transaction run on the client the callback is
        // handed, not on this one, so that client needs wrapping too.
        if (property === 'begin' || property === 'reserve' || property === 'savepoint') {
          return (...args: unknown[]) => {
            const wrapped = args.map((arg) =>
              typeof arg === 'function'
                ? (inner: Sql, ...rest: unknown[]) =>
                    (arg as (...a: unknown[]) => unknown)(wrapClient(inner), ...rest)
                : arg
            );
            // `savepoint` only exists on a transaction client, which this
            // proxy also wraps — hence the index through an untyped view.
            const open = (sql as unknown as Record<string, (...a: unknown[]) => unknown>)[property];
            return open(...wrapped);
          };
        }

        const value = Reflect.get(sql, property, receiver);
        return typeof value === 'function' ? value.bind(sql) : value;
      },
    });

  return wrapClient(client);
}
