import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { eq } from 'drizzle-orm';

import { db, puzzleSolutions } from '@/lib/db';
import { getPositionWithProfileById } from '@/lib/positions/queries';

import { resolveExpInfoFromGrantParam } from '@/app/[locale]/(public)/practice/_lib/createPracticeResultPage';
import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PuzzleResultClient } from '../../_components/PuzzleResultClient';

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

  const [row, resolvedSearchParams] = await Promise.all([
    getPositionWithProfileById({ id, type: 'puzzle' }),
    searchParams,
  ]);

  if (!row) {
    notFound();
  }

  const { position } = row;

  const [solutions, expInfo] = await Promise.all([
    db
      .select({ solutionMoves: puzzleSolutions.solutionMoves })
      .from(puzzleSolutions)
      .where(eq(puzzleSolutions.positionId, position.id)),
    resolveExpInfoFromGrantParam(resolvedSearchParams, 'practice_result'),
  ]);

  const solutionMoveLists = solutions.map((s) => s.solutionMoves);
  const solutionLines = solutionMoveLists.map((moves) => moves.map((m) => m.san).join(' '));

  const adBannerStandard =
    IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM ? (
      <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
    ) : undefined;

  return (
    <div className="space-y-8">
      <PageTitle>{t('result.title')}</PageTitle>

      <PagePanel>
        <PuzzleResultClient
          positionId={position.id}
          fen={position.fen}
          solutionLines={solutionLines}
          solutionMoveLists={solutionMoveLists}
          expInfo={expInfo}
        />

        {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('list.title'), href: '/practice/puzzle' },
            { label: position.title, href: `/practice/puzzle/${position.id}` },
            { label: t('result.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
