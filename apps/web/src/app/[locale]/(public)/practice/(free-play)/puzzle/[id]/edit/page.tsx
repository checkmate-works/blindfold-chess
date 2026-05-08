import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DeletePuzzleButton } from '../../_components/DeletePuzzleButton';
import { EditPuzzleForm } from '../../_components/EditPuzzleForm';
import { loadPuzzleWithSolutions } from '../../_lib/load-puzzle';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle.edit' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `practice/puzzle/${id}/edit`,
      title,
    }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function EditPuzzlePage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const user = await getAuthenticatedUser();

  const row = await loadPuzzleWithSolutions(id);
  if (!row) {
    notFound();
  }

  const { position, solutions } = row;

  if (position.userId !== user.id) {
    redirect(`/${locale}/practice/puzzle/${id}`);
  }

  const solutionMoves = solutions[0]?.solutionMoves.map((m) => m.san) ?? [];

  return (
    <PageLayout
      title={t('list.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/puzzle' },
        { label: position.title, href: `/practice/puzzle/${id}` },
        { label: t('edit.title') },
      ]}
    >
      <SectionTitle>{t('edit.title')}</SectionTitle>
      <EditPuzzleForm
        positionId={position.id}
        initial={{
          title: position.title,
          description: position.description,
          fen: position.fen,
          solutionMoves,
        }}
      />

      <section
        aria-labelledby="danger-zone-heading"
        className="mt-12 rounded-md border border-destructive/40 p-4 space-y-3"
      >
        <h2 id="danger-zone-heading" className="text-sm font-semibold text-destructive">
          {t('delete.sectionTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('delete.sectionDescription')}</p>
        <DeletePuzzleButton puzzleId={position.id} locale={locale} />
      </section>
    </PageLayout>
  );
}
