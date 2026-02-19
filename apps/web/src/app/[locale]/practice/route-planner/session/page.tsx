import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

import { RoutePlannerSession } from '../_components/RoutePlannerSession';
import { PIECES } from '../_lib/utils';
import type { PieceType } from '../_lib/utils';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/route-planner/session' }),
    title: t('practice.routePlanner.title'),
    description: t('practice.routePlanner.description'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function RoutePlannerSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations({ locale });

  // Parse problem count (default 5)
  const countParam = search.count;
  let problemCount = 5;
  if (countParam && typeof countParam === 'string') {
    const parsed = parseInt(countParam);
    if (!isNaN(parsed) && parsed >= 1) {
      problemCount = parsed;
    }
  }

  // Parse allowed pieces
  const piecesParam = search.pieces;
  let allowedPieces: PieceType[] = [];
  if (piecesParam && typeof piecesParam === 'string') {
    const potentialPieces = piecesParam.split('') as PieceType[];
    // Filter only valid pieces
    allowedPieces = potentialPieces.filter((p) => PIECES.includes(p));
  }
  // If empty or invalid, default to all pieces (handled in utils or component,
  // but safer to pass empty array here if we want default behavior)
  if (allowedPieces.length === 0) {
    allowedPieces = [...PIECES];
  }
  // Parse tutorial mode params
  const mode = search.mode === 'tutorial' ? 'tutorial' : 'standard';

  let initialProblem;
  if (mode === 'tutorial') {
    const piece = search.piece as PieceType;
    const start = search.start as string;
    const end = search.end as string;

    if (piece && start && end) {
      initialProblem = { piece, start, end };
    }
  }

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.routePlanner.title')}
      showDivider={false}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        {
          label: t('practice.routePlanner.title'),
          href: '/practice/route-planner',
        },
        { label: t('practice.session') },
      ]}
    >
      <RoutePlannerSession
        locale={locale}
        problemCount={problemCount}
        allowedPieces={allowedPieces}
        mode={mode}
        initialProblem={initialProblem}
      />
    </PracticeSessionPage>
  );
}
