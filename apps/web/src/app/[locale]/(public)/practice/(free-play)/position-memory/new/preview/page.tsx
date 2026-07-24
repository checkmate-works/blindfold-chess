import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { loadAvailableTags } from '@/lib/positions/tag-loader';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PositionMemoryPreviewClient } from '../../_components/PositionMemoryPreviewClient';

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'practice.positionMemory',
    path: 'practice/position-memory/new/preview',
    titleKey: 'preview.title',
    omitDescription: true,
  });
}

export default async function PositionMemoryPreviewPage({ params }: Props) {
  const { locale } = await params;
  await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  // The tag catalog resolves the draft's persisted theme/chunk IDs back into
  // display labels for the preview's read-only tag list (the draft stores only
  // IDs). Same source the create form's picker loads from.
  const availableTags = await loadAvailableTags(locale);

  return (
    <PageLayout
      title={t('preview.title')}
      locale={locale}
      breadcrumb={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        { label: t('create.title'), href: '/practice/position-memory/new' },
        { label: t('preview.title') },
      ]}
    >
      <PositionMemoryPreviewClient
        availableThemes={availableTags.themes}
        availableChunks={availableTags.chunks}
      />
    </PageLayout>
  );
}
