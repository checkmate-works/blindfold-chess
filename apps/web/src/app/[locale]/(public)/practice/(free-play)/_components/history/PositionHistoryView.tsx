import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { listContentRevisionsForPosition } from '@/lib/positions/content-revision-queries';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import type { PositionType } from '@/lib/positions/types';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionContentRevisionItem } from './PositionContentRevisionItem';

type Props = {
  positionId: string;
  /** 'memory' | 'puzzle' — drives the namespace + breadcrumb paths. */
  positionType: Extract<PositionType, 'memory' | 'puzzle'>;
  locale: Locale;
};

const TYPE_CONFIG = {
  memory: { namespace: 'practice.positionMemory', listPath: '/practice/position-memory' },
  puzzle: { namespace: 'practice.puzzle', listPath: '/practice/puzzle' },
} as const;

/**
 * Shared body for a position's edit-history page — the owner's own edits to
 * title / FEN / description / solution moves, oldest overwritten value next
 * to the new one, newest edit first. Distinct from
 * `PositionEditRequestsView` (chunk-tag suggestions from other users, a
 * moderation queue): this page has nothing to accept or reject, it's a
 * read-only record, open to any visitor since positions are a public UGC
 * catalog.
 *
 * A position edited before this feature shipped has no
 * `position_content_revisions` rows at all; the empty state distinguishes
 * that case (`legacyEditNotice`) from a position that was genuinely never
 * edited (`empty`) using the same `updatedAt - createdAt` heuristic the old
 * "(edited)" marker used, so pre-existing edits aren't misreported as
 * "never edited".
 */
export async function PositionHistoryView({ positionId, positionType, locale }: Props) {
  const row = await getPositionWithProfileById({ id: positionId, type: positionType });
  if (!row) {
    notFound();
  }
  const { position } = row;

  const { namespace, listPath } = TYPE_CONFIG[positionType];
  const detailPath = `${listPath}/${position.id}`;

  const [revisions, t, tNav, tType] = await Promise.all([
    listContentRevisionsForPosition(position.id),
    getTranslations({ locale, namespace: 'practice.positionHistory' }),
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale, namespace }),
  ]);

  const predatesTracking = position.updatedAt.getTime() - position.createdAt.getTime() > 1000;

  return (
    <PageLayout
      title={t('pageTitle', { name: position.title })}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: tType('list.title'), href: listPath },
        { label: position.title, href: detailPath },
        { label: t('breadcrumb') },
      ]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {predatesTracking ? t('legacyEditNotice') : t('empty')}
        </p>
      ) : (
        <div className="space-y-4">
          {revisions.map(({ revision, profile }) => (
            <PositionContentRevisionItem
              key={revision.id}
              changes={revision.changes}
              createdAt={revision.createdAt}
              editor={profile}
              locale={locale}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
