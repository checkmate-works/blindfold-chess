import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { loadAvailableTags } from '@/lib/positions/tag-loader';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PuzzlePreviewClient } from '../../_components/PuzzlePreviewClient';

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'practice.puzzle',
    path: 'practice/puzzle/new/preview',
    titleKey: 'preview.title',
    omitDescription: true,
  });
}

export default async function PuzzlePreviewPage({ params }: Props) {
  const { locale } = await params;
  await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  // The tag catalog resolves the draft's persisted theme/chunk IDs back into
  // display labels for the preview's read-only tag list (the draft stores only
  // IDs). Same source the position step's picker loads from.
  const availableTags = await loadAvailableTags(locale);

  return (
    <PageLayout
      title={t('preview.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('title'), href: '/practice/puzzle' },
        { label: t('create.title'), href: '/practice/puzzle/new' },
        { label: t('create.solutionPageTitle'), href: '/practice/puzzle/new/solution' },
        { label: t('preview.title') },
      ]}
    >
      <PuzzlePreviewClient
        availableThemes={availableTags.themes}
        availableChunks={availableTags.chunks}
      />
    </PageLayout>
  );
}
