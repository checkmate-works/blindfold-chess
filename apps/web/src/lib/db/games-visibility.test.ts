import { describe, expect, it } from 'vitest';

import { db, games } from '@/lib/db';

import { publiclyVisible, visibleToViewer } from './games-visibility';

const VIEWER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

/**
 * Asserts on the SQL drizzle generates rather than on a mocked query builder.
 * What these predicates are worth depends entirely on how they are spelled: an
 * `OR` arm that forgets `deleted_at IS NULL` hands the author back a game they
 * deleted, and every call site composes the predicate into a larger `WHERE`
 * where that omission is invisible. A stubbed builder would assert none of
 * that, and the alternative — a fixture game per branch — needs the shared
 * database. `toSQL()` opens no connection.
 */
function compile(where: ReturnType<typeof publiclyVisible>) {
  const { sql, params } = db.select({ id: games.id }).from(games).where(where).toSQL();
  const bound = sql.replace(/\$(\d+)/g, (_, i) => {
    const v = params[Number(i) - 1];
    return typeof v === 'string' ? `'${v}'` : String(v);
  });
  return bound.replace(/\s+/g, ' ');
}

describe('publiclyVisible', () => {
  it('admits a game only while it is live AND public', () => {
    expect(compile(publiclyVisible())).toContain(
      `("games"."deleted_at" is null and "games"."status" = 'public')`
    );
  });
});

describe('visibleToViewer', () => {
  const sql = compile(visibleToViewer(VIEWER));

  it('keeps the public arm exactly as publiclyVisible spells it', () => {
    // Widening by a viewer must not fork the public rule: when the owner-only
    // `private` tier lands in `publiclyVisible`, this arm has to follow it
    // with no edit here.
    expect(sql).toContain(`("games"."deleted_at" is null and "games"."status" = 'public')`);
  });

  it("admits the viewer's own game whatever its status", () => {
    // No status term on this arm — an unpublished game is still its author's.
    expect(sql).toContain(`"games"."author_id" = '${VIEWER}'`);
  });

  it('guards the owner arm with its own soft-delete check', () => {
    // Deleting a game puts it out of its author's reach too, so the arm that
    // lets them through cannot be a bare `OR author_id = …`.
    expect(sql).toContain(`("games"."deleted_at" is null and "games"."author_id" = '${VIEWER}')`);
  });

  it('joins the two arms with OR, so neither narrows the other', () => {
    expect(sql).toMatch(/where \(.* or .*\)/);
  });
});
