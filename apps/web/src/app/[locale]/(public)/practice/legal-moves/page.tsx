import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { CardLink, Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMoves } from './_components/LegalMoves';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves' }),
    title: t('practice.legalMoves.title'),
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.legalMoves.title')}</PageTitle>

      <PagePanel>
        <LegalMoves locale={locale} />

        <AdBanner slot="banner-wide" locale={locale} />

        <div className="mt-8 space-y-4">
          <SectionTitle>{t('practice.legalMoves.relatedArticles')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CardLink
              href="/learn/moves/king-movement"
              icon="♔"
              title={t('practice.legalMoves.articles.king.title')}
              description={t('practice.legalMoves.articles.king.description')}
              locale={locale}
            />
            <CardLink
              href="/learn/moves/knight-movement"
              icon="♘"
              title={t('practice.legalMoves.articles.knight.title')}
              description={t('practice.legalMoves.articles.knight.description')}
              locale={locale}
            />
            <CardLink
              href="/learn/moves/rook-movement"
              icon="♜"
              title={t('practice.legalMoves.articles.rook.title')}
              description={t('practice.legalMoves.articles.rook.description')}
              locale={locale}
            />
            <CardLink
              href="/learn/moves/bishop-movement"
              icon="♗"
              title={t('practice.legalMoves.articles.bishop.title')}
              description={t('practice.legalMoves.articles.bishop.description')}
              locale={locale}
            />
          </div>
        </div>

        <AdBanner slot="banner-standard" locale={locale} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.legalMoves.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
