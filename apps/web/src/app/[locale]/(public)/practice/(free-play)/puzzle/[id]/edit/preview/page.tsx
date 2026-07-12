import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth';
import { loadAvailableTags } from '@/lib/positions/tag-loader';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { EditPuzzlePreviewClient } from '../../../_components/EditPuzzlePreviewClient';
import { loadPuzzleWithSolutions } from '../../../_lib/load-puzzle';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle.preview' });
  const title = t('title');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/puzzle/[id]/edit/preview',
      title,
    }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

/**
 * Preview step of the puzzle edit flow — a read-only replay of the draft that
 * ends in Save. Like `edit/solution/page.tsx`, this route hand-rolls its own
 * auth/ownership check rather than going through the shared
 * `createPositionEditPage` factory (whose page shape bundles the danger zone
 * into the position step). All authoring state comes from the ID-scoped edit
 * draft written by the earlier steps; `EditPuzzlePreviewClient` redirects back
 * to `/edit` if that draft is missing.
 */
export default async function PuzzleEditPreviewPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const user = await getAuthenticatedUser();

  const [data, availableTags] = await Promise.all([
    loadPuzzleWithSolutions(id),
    // Resolves the edit draft's persisted theme/chunk IDs into display labels
    // for the preview's read-only tag list.
    loadAvailableTags(locale),
  ]);
  if (!data) {
    notFound();
  }

  const { position } = data;
  if (position.userId !== user.id) {
    redirect(`/${locale}/practice/puzzle/${id}`);
  }

  const previewTitle = t('preview.title');

  return (
    <PageLayout
      title={previewTitle}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: position.title, href: `/practice/puzzle/${id}` },
        { label: t('edit.title'), href: `/practice/puzzle/${id}/edit` },
        { label: t('create.solutionPageTitle'), href: `/practice/puzzle/${id}/edit/solution` },
        { label: previewTitle },
      ]}
    >
      <EditPuzzlePreviewClient
        positionId={position.id}
        availableThemes={availableTags.themes}
        availableChunks={availableTags.chunks}
      />
    </PageLayout>
  );
}
