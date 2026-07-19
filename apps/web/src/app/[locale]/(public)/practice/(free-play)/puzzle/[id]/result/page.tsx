import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { db, puzzleSolutions } from '@/lib/db';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { resolveAuthorName } from '@/lib/users/display-name';

import { resolveExpInfoFromGrantParam } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';
import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PuzzleResultClient } from '../../_components/PuzzleResultClient';
import { PuzzleResultContentSkeleton } from '../../_components/PuzzleResultContentSkeleton';

// `expInfo` is keyed off the `?grant=<id>` query param, which is
// per-grant-event and per-user. Static caching would either serve a stale
// EXP banner or cross-pollinate one user's grant onto another's session, so
// the page must opt out of ISR/`revalidate`.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: { params: Props['params'] }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });

  const row = await getPositionWithProfileById({ id, type: 'puzzle' });

  if (!row) {
    return { title: t('result.title') };
  }

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/puzzle/${id}/result`,
      title: `${row.position.title} - ${t('result.title')}`,
      description: t('description'),
    }),
    title: resolveTitle(`${row.position.title} - ${t('result.title')}`, locale),
  };
}

export default async function PuzzleResultPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale, namespace: 'Common' });

  const [row, resolvedSearchParams] = await Promise.all([
    getPositionWithProfileById({ id, type: 'puzzle' }),
    searchParams,
  ]);

  if (!row) {
    notFound();
  }

  const { position, profile } = row;
  const displayName = resolveAuthorName(profile, { fallback: tCommon('deletedUser') });

  const [solutions, expInfo] = await Promise.all([
    db
      .select({ solutionMoves: puzzleSolutions.solutionMoves })
      .from(puzzleSolutions)
      .where(eq(puzzleSolutions.positionId, position.id)),
    resolveExpInfoFromGrantParam(resolvedSearchParams, 'practice_result'),
  ]);

  const solutionMoveLists = solutions.map((s) => s.solutionMoves);
  const solutionLines = solutionMoveLists.map((moves) => moves.map((m) => m.san).join(' '));

  const adBannerStandard = <AdSlot slot="content-bottom" />;

  return (
    <PageLayout
      title={t('result.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/puzzle' },
        { label: position.title, href: `/practice/puzzle/${position.id}` },
        { label: t('result.title') },
      ]}
    >
      {/* Fallback fills the panel body while the PuzzleResultClient chunk loads
          on a soft navigation. The chrome (PageTitle / PagePanel / Breadcrumb)
          is server-rendered by PageLayout outside this boundary, so only the
          inner content needs covering — matching the route loading.tsx. */}
      <Suspense fallback={<PuzzleResultContentSkeleton />}>
        <PuzzleResultClient
          locale={locale}
          positionId={position.id}
          fen={position.fen}
          solutionLines={solutionLines}
          solutionMoveLists={solutionMoveLists}
          expInfo={expInfo}
        />
      </Suspense>

      {/* Single-line "Created by [avatar] name" attribution — the pre-panel
          style, restored here only. The SNS-style PositionAuthorHeader panel
          reserves space on the right for its "⋯" menu, which this screen
          never has (no edit/fork actions), so the panel reads as unbalanced
          empty space. This inline row has no such gap. */}
      <div className="mt-8 flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <span>{t('detail.createdBy')}</span>
        <UserAvatar
          profileHref={profile?.username ? `/u/${profile.username}` : null}
          avatarUrl={profile?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="xs"
          layout="inline"
        />
      </div>

      {/* `ad-slot-wrapper` so the spacer collapses with the ad for ad-free viewers. */}
      {adBannerStandard && <div className="mt-8 ad-slot-wrapper">{adBannerStandard}</div>}
    </PageLayout>
  );
}
