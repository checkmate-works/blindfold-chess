import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from '../../_components/AlphabeticalIndex';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { getTermsByLetter } from '../../_lib/queries';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    letter: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, letter } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.glossary.letter' });
  const upperLetter = letter.toUpperCase();

  const title = t('title', { letter: upperLetter });
  const description = t('description', { letter: upperLetter });

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `glossary/letter/${letter.toLowerCase()}`,
      title: title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function GlossaryLetterPage({ params }: Props) {
  const { locale, letter } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const upperLetter = letter.toUpperCase();

  const filteredTerms = await getTermsByLetter(letter, locale);

  return (
    <div className="space-y-8">
      <PageTitle>{t('letterPage.title', { letter: upperLetter })}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('letterPage.termsTitle')}</SectionTitle>

        <GlossaryTermList terms={filteredTerms} locale={locale} />

        <AdBannerGuard slot="banner-wide" />

        <SectionTitle>{t('alphabeticalIndexTitle')}</SectionTitle>

        <AlphabeticalIndex locale={locale} currentLetter={letter.toLowerCase()} />

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb
          items={[{ label: t('title'), href: '/glossary' }, { label: upperLetter }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
