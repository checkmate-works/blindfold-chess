import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The game lookup behind a chunk link is only worth anything because of the
 * `publiclyVisible()` filter in its WHERE: without it a `game_id` the client
 * made up still satisfies the foreign key, lands a row, and reaches the game
 * owner's notifications. That filter is invisible in the return value — the
 * answer for "no such game" and for "not a game the site serves" is the same
 * `false` — so the assertions below read the condition the query was built
 * with and render it to SQL. `sqlToQuery` needs no connection and no db
 * instance.
 */
const dialect = new PgDialect();
function render(condition: SQL | undefined): string {
  if (!condition) return '';
  const { sql, params } = dialect.sqlToQuery(condition);
  const bound = sql.replace(/\$(\d+)/g, (_, i) => {
    const v = params[Number(i) - 1];
    return typeof v === 'string' ? `'${v}'` : String(v);
  });
  return bound.replace(/\s+/g, ' ');
}

/** WHERE conditions handed to the module-level `db`, oldest first. */
const dbWheres: (SQL | undefined)[] = [];
let dbRows: unknown[] = [];

vi.mock('./index', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (condition: SQL | undefined) => {
          dbWheres.push(condition);
          return { limit: async () => dbRows };
        },
      }),
    }),
  },
}));

const { isLinkableGame } = await import('./game-chunks');

const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

/** `deleted_at IS NULL AND status = 'public'`, as drizzle renders it. */
const PUBLICLY_VISIBLE = `("games"."deleted_at" is null and "games"."status" = 'public')`;

describe('isLinkableGame', () => {
  beforeEach(() => {
    dbWheres.length = 0;
    dbRows = [];
  });

  it('looks the game up under the publicly-visible rule', async () => {
    await isLinkableGame(GAME_ID);

    const where = render(dbWheres[0]);
    expect(where).toContain(`"games"."id" = '${GAME_ID}'`);
    expect(where).toContain(PUBLICLY_VISIBLE);
  });

  it('answers false when the filtered lookup matches nothing', async () => {
    // One answer for all three unreachable cases — no such id, soft-deleted,
    // never published — because the caller does the same thing with each.
    expect(await isLinkableGame(GAME_ID)).toBe(false);
  });

  it('answers true for a game the lookup admits', async () => {
    dbRows = [{ id: GAME_ID }];

    expect(await isLinkableGame(GAME_ID)).toBe(true);
  });
});
