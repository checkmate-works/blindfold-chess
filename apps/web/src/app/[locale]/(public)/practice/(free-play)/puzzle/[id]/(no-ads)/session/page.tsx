import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PuzzleSessionClient } from '../../../_components/session/PuzzleSessionClient';
import { loadPuzzleWithSolutions } from '../../../_lib/load-puzzle';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });

  const row = await loadPuzzleWithSolutions(id);
  if (!row) {
    return { title: t('session.title') };
  }

  const title = `${row.position.title} - ${t('session.title')}`;
  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/puzzle/${id}/session`,
      title,
      description: t('description'),
    }),
    title: resolveTitle(title, locale),
  };
}

export default async function PuzzleSessionPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const row = await loadPuzzleWithSolutions(id);
  if (!row) {
    notFound();
  }

  const { position, solutions } = row;

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/puzzle' },
        { label: position.title, href: `/practice/puzzle/${position.id}` },
        { label: t('session.title') },
      ]}
      locale={locale}
    />
  );

  return (
    <PuzzleSessionClient
      solutions={solutions.map((s) => s.solutionMoves)}
      positionId={position.id}
      fen={position.fen}
      positionTitle={position.title}
      breadcrumb={breadcrumb}
    />
  );
}
