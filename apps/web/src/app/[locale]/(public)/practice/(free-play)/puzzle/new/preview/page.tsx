import { getTranslations } from 'next-intl/server';

import { getAuthenticatedUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { PuzzlePreviewClient } from '../../_components/PuzzlePreviewClient';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const title = t('preview.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/puzzle/new/preview', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function PuzzlePreviewPage({ params }: Props) {
  const { locale } = await params;
  await getAuthenticatedUser();
  const t = await getTranslations({ locale, namespace: 'practice.puzzle' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('preview.title')}</PageTitle>

      <PagePanel>
        <PuzzlePreviewClient />

        <Divider />

        <Breadcrumb
          items={[
            { label: tNav('practice'), href: '/practice' },
            { label: t('title'), href: '/practice/puzzle' },
            { label: t('create.title'), href: '/practice/puzzle/new' },
            { label: t('preview.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
