import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditPuzzleSolutionForm } from '../../../_components/EditPuzzleSolutionForm';
import { loadPuzzleWithSolutions } from '../../../_lib/load-puzzle';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle.create' });
  const title = t('solutionPageTitle');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/puzzle/[id]/edit/solution',
      title,
    }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

/**
 * Solution step of the puzzle edit flow — read-only board + solution-move
 * entry, ending in Save. This route hand-rolls its own auth/ownership check
 * (mirroring `new/preview/page.tsx`'s precedent) rather than going through
 * the shared `createPositionEditPage` factory, since that factory bundles
 * the danger zone into a single page alongside the position-step form — a
 * shape this second step doesn't share. All authoring state (title,
 * description, fen, tags, carried-through moves) comes from the ID-scoped
 * edit draft written by the position step; `EditPuzzleSolutionForm` redirects
 * back to `/edit` if that draft is missing.
 */
export default async function PuzzleEditSolutionPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const user = await getAuthenticatedUser();

  const data = await loadPuzzleWithSolutions(id);
  if (!data) {
    notFound();
  }

  const { position } = data;
  if (position.userId !== user.id) {
    redirect(`/${locale}/practice/puzzle/${id}`);
  }

  const solutionPageTitle = t('create.solutionPageTitle');

  return (
    <PageLayout
      title={solutionPageTitle}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: position.title, href: `/practice/puzzle/${id}` },
        { label: t('edit.title'), href: `/practice/puzzle/${id}/edit` },
        { label: solutionPageTitle },
      ]}
    >
      <SectionTitle>{solutionPageTitle}</SectionTitle>
      <EditPuzzleSolutionForm positionId={position.id} />
    </PageLayout>
  );
}
