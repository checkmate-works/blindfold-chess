import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, MarkdownRenderer, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import contentEn from './_content/en';
import contentJa from './_content/ja';

export const dynamic = 'force-static';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gettingStarted' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'getting-started' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function GettingStartedPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const content = locale === 'ja' ? contentJa : contentEn;

  return (
    <div className="space-y-8">
      <PageTitle>{t('gettingStarted.title')}</PageTitle>

      <article className="prose prose-slate dark:prose-invert max-w-none space-y-4">
        <MarkdownRenderer content={content} skipFirstH1={true} />
      </article>

      <Divider />

      <Breadcrumb items={[{ label: t('gettingStarted.title') }]} locale={locale} />
    </div>
  );
}
