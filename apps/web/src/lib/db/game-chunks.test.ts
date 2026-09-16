import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Both write paths that create a `game_chunks` row look the target game up
 * first, and the only thing that makes those lookups worth anything is the
 * `publiclyVisible()` filter in their WHERE: without it a `game_id` the client
 * made up still satisfies the foreign key, lands a row, and reaches the game
 * owner's notifications. That filter is invisible in the return value — both
 * functions answer the same `false` / `undefined` for "no such game" as for
 * "not a game the site serves" — so the assertions below read the condition
 * the query was built with and render it to SQL. `sqlToQuery` needs no
 * connection and no db instance.
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

const { isLinkableGame, linkNewChunkToGameMove } = await import('./game-chunks');

const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CHUNK_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const AUTHOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

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

describe('linkNewChunkToGameMove', () => {
  const txWheres: (SQL | undefined)[] = [];
  const insertValues = vi.fn();
  let gameRows: { moveCount: number }[] = [];
  let insertedRows: unknown[] = [];

  /**
   * Stands in for the create-a-chunk transaction. Structural rather than a
   * mocked `db`, because the function takes its transaction as an argument
   * precisely so the link shares the chunk's transaction.
   */
  const tx = {
    select: () => ({
      from: () => ({
        where: (condition: SQL | undefined) => {
          txWheres.push(condition);
          return { limit: async () => gameRows };
        },
      }),
    }),
    insert: () => ({
      values: (values: unknown) => {
        insertValues(values);
        return {
          onConflictDoNothing: () => ({ returning: async () => insertedRows }),
        };
      },
    }),
  } as unknown as Parameters<typeof linkNewChunkToGameMove>[0];

  const link = (ply: number) =>
    linkNewChunkToGameMove(tx, {
      gameId: GAME_ID,
      ply,
      chunkId: CHUNK_ID,
      suggestedById: AUTHOR_ID,
    });

  beforeEach(() => {
    txWheres.length = 0;
    gameRows = [{ moveCount: 20 }];
    insertedRows = [{ id: 'link-1' }];
  });

  it('looks the game up under the same publicly-visible rule as the picker path', async () => {
    await link(3);

    const where = render(txWheres[0]);
    expect(where).toContain(`"games"."id" = '${GAME_ID}'`);
    expect(where).toContain(PUBLICLY_VISIBLE);
  });

  it('links a move of a visible game', async () => {
    expect(await link(3)).toBe(true);
    expect(insertValues).toHaveBeenCalledWith({
      gameId: GAME_ID,
      ply: 3,
      chunkId: CHUNK_ID,
      suggestedById: AUTHOR_ID,
    });
  });

  it('skips the link when the filtered lookup finds no game, without inserting', async () => {
    // A soft-deleted or unpublished game drops out of the same lookup a
    // missing one does. `false` is what keeps `createChunkEntry` from
    // notifying an owner about a game the site serves to nobody — and the
    // chunk itself still gets written, since the link was the convenience.
    gameRows = [];

    expect(await link(3)).toBe(false);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('skips a ply past the end of the move list', async () => {
    expect(await link(20)).toBe(false);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('reports false when the link was already there', async () => {
    insertedRows = [];

    expect(await link(3)).toBe(false);
  });
});
