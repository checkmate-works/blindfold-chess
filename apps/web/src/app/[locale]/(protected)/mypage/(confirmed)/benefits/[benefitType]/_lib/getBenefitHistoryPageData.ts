import { and, desc, eq, sql } from 'drizzle-orm';

import { db, userGrants } from '@/lib/db';
import { type GrantType, isGrantType } from '@/lib/db/data/grant-types';
import { getPaginationParams } from '@/lib/pagination';

import { resolveGrantSources } from '@/app/[locale]/(protected)/mypage/(confirmed)/benefits/_lib/resolve-grant-sources';

import { type GrantSourceMeta, resolveGrantSourceMeta } from '../../_lib/source';

export type GrantHistoryRowStatus = 'active' | 'upcoming' | 'expired' | 'revoked';

type BenefitHistoryRow = {
  id: string;
  /** Discriminator the page maps to `t(`grantTypeLabel.${labelKey}`)`. */
  sourceLabelKey: GrantSourceMeta['labelKey'];
  sourceHref: string | null;
  startsAt: Date;
  expiresAt: Date;
  status: GrantHistoryRowStatus;
};

export type BenefitHistoryPageData = {
  rows: BenefitHistoryRow[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

function classifyGrantForHistory(
  now: Date,
  startsAt: Date,
  expiresAt: Date,
  revokedAt: Date | null
): GrantHistoryRowStatus {
  if (revokedAt) return 'revoked';
  if (expiresAt <= now) return 'expired';
  if (startsAt > now) return 'upcoming';
  return 'active';
}

/**
 * Load the paginated audit history for a single benefitType (currently
 * only `'ad_free'`). Unlike `/mypage/benefits` this view INCLUDES
 * revoked grants so the user can see their full timeline.
 *
 * Source rows for the visible page are batched into two IN queries to
 * avoid N+1 lookups; hard-deleted source rows fall through to a
 * non-link label, mirroring `/mypage/benefits`.
 */
export async function getBenefitHistoryPageData({
  userId,
  benefitType,
  page,
  pageSize,
}: {
  userId: string;
  benefitType: string;
  page: number;
  pageSize: number;
}): Promise<BenefitHistoryPageData> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userGrants)
    .where(and(eq(userGrants.userId, userId), eq(userGrants.benefitType, benefitType)));

  const totalCount = Number(countResult?.count ?? 0);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    pageSize
  );

  const grantRows = await db
    .select()
    .from(userGrants)
    .where(and(eq(userGrants.userId, userId), eq(userGrants.benefitType, benefitType)))
    .orderBy(desc(userGrants.startsAt))
    .limit(limit)
    .offset(offset);

  const { topicPostMap, positionMap } = await resolveGrantSources(grantRows);

  const now = new Date();

  const rows: BenefitHistoryRow[] = grantRows.map((g) => {
    const startsAt = new Date(g.startsAt);
    const expiresAt = new Date(g.expiresAt);
    const revokedAt = g.revokedAt ? new Date(g.revokedAt) : null;
    const grantTypeKey: GrantType = isGrantType(g.grantType) ? g.grantType : 'admin_manual';

    const { labelKey, href } = resolveGrantSourceMeta(
      { grantType: grantTypeKey, sourceType: g.sourceType, sourceId: g.sourceId },
      topicPostMap,
      positionMap
    );

    return {
      id: g.id,
      sourceLabelKey: labelKey,
      sourceHref: href,
      startsAt,
      expiresAt,
      status: classifyGrantForHistory(now, startsAt, expiresAt, revokedAt),
    };
  });

  return { rows, totalCount, currentPage, totalPages };
}
