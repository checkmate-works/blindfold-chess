import { cache } from 'react';

import { and, count, desc, eq } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';

import { AUTHOR_PROFILE_COLUMNS, db, profiles } from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

/** Shape of the proposer profile joined onto each request row. */
export type EditRequestProposer = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type EditRequestTable = PgTable & {
  id: AnyPgColumn;
  proposerId: AnyPgColumn;
  status: AnyPgColumn;
  createdAt: AnyPgColumn;
};

/**
 * Builds the read-side query set shared by the chunk and position
 * edit-request domains. The two tables are structural twins (same state
 * machine, same proposer join, same one-pending-per-proposer invariant);
 * only the table and the parent FK column differ, so the queries are
 * generated rather than hand-copied.
 *
 * Unlike the mutation state machines (deliberately not unified — see
 * `./shared.ts`), these reads are genuinely identical.
 */
export function makeEditRequestQueries<TTable extends EditRequestTable>({
  table,
  parentIdColumn,
}: {
  table: TTable;
  /** FK column on `table` pointing at the parent entity (chunk / position). */
  parentIdColumn: AnyPgColumn;
}) {
  type RequestRow = TTable['$inferSelect'];

  /**
   * All edit requests for a parent, newest first, joined with each
   * proposer's profile (LEFT join so orphaned-author rows still surface
   * with `proposer = null`). Used on the detail page for both the owner's
   * review surface and the public read of past suggestions.
   */
  const listForParent = cache(
    async (
      parentId: string
    ): Promise<Array<{ request: RequestRow; proposer: EditRequestProposer | null }>> => {
      if (!UUID_RE.test(parentId)) return [];

      const rows = await db
        .select({
          request: table as PgTable,
          proposer: AUTHOR_PROFILE_COLUMNS,
        })
        .from(table as PgTable)
        .leftJoin(profiles, eq(table.proposerId, profiles.id))
        .where(eq(parentIdColumn, parentId))
        .orderBy(desc(table.createdAt));

      return rows as Array<{ request: RequestRow; proposer: EditRequestProposer | null }>;
    }
  );

  /**
   * Count pending edit requests for a parent. Read by the detail page to
   * render the "N pending suggestions" badge without materializing the
   * full list.
   */
  const countPendingForParent = cache(async (parentId: string): Promise<number> => {
    if (!UUID_RE.test(parentId)) return 0;

    const [row] = await db
      .select({ value: count() })
      .from(table as PgTable)
      .where(and(eq(parentIdColumn, parentId), eq(table.status, 'pending')));
    return row?.value ?? 0;
  });

  /**
   * Count all edit requests (any status) for a parent. Used to decide
   * whether to surface a "history" entry point even when no request is
   * currently pending.
   */
  const countForParent = cache(async (parentId: string): Promise<number> => {
    if (!UUID_RE.test(parentId)) return 0;

    const [row] = await db
      .select({ value: count() })
      .from(table as PgTable)
      .where(eq(parentIdColumn, parentId));
    return row?.value ?? 0;
  });

  /**
   * Fetch a single edit request by id. Used by the mutation core to load
   * the row before each transition. No caching — mutations need the
   * freshest read possible.
   */
  async function getById(id: string): Promise<RequestRow | null> {
    if (!UUID_RE.test(id)) return null;
    const [row] = await db
      .select()
      .from(table as PgTable)
      .where(eq(table.id, id))
      .limit(1);
    return (row as RequestRow | undefined) ?? null;
  }

  /**
   * Find the viewer's own pending edit request for a parent, if any.
   * Returns the request id (used by the detail page to switch the form
   * CTA between "Suggest" and "View / withdraw") or `null` when the
   * viewer has none pending. Anchors the one-pending-per-(parent,
   * proposer) invariant the mutation layer enforces.
   */
  const getViewerPendingForParent = cache(
    async (parentId: string, viewerId: string | null): Promise<string | null> => {
      if (!viewerId) return null;
      if (!UUID_RE.test(parentId) || !UUID_RE.test(viewerId)) return null;

      const [row] = await db
        .select({ id: table.id })
        .from(table as PgTable)
        .where(
          and(
            eq(parentIdColumn, parentId),
            eq(table.proposerId, viewerId),
            eq(table.status, 'pending')
          )
        )
        .limit(1);

      return (row?.id as string | undefined) ?? null;
    }
  );

  return {
    listForParent,
    countPendingForParent,
    countForParent,
    getById,
    getViewerPendingForParent,
  };
}
