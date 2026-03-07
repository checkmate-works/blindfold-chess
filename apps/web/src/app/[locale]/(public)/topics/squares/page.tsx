import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  Breadcrumb,
  Divider,
  PageDescription,
  PagePanel,
  PageTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareBoard } from './_components';
import { getSquarePostCounts } from './_lib/queries';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquares' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/squares' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function SquaresPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'topics' });

  const postCounts = await getSquarePostCounts();

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.title')}</PageTitle>

      <PageDescription>{t('squares.description')}</PageDescription>

      <PagePanel>
        <SquareBoard locale={locale} postCounts={postCounts} />

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/topics' }, { label: t('squares.title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
