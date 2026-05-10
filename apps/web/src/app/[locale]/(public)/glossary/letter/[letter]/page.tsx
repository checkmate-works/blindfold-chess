import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

import {
  ADSENSE_SLOT_CONTENT_BOTTOM,
  ADSENSE_SLOT_CONTENT_MIDDLE,
  IS_LOCAL_DEV,
  SUPPORTED_LOCALES,
} from '@/config';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AlphabeticalIndex } from '../../_components/AlphabeticalIndex';
import { GlossaryTermList } from '../../_components/GlossaryTermList';
import { getTermsByLetter } from '../../_lib/queries';

export const revalidate = 3600;

type Props = {
  params: Promise<{
    locale: Locale;
    letter: string;
  }>;
};

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)); // a-z

/**
 * Only a–z letter pages are prerendered at build time. Non-Latin starting
 * letters (e.g., hiragana/katakana terms) fall through to on-demand ISR via
 * Next.js's default `dynamicParams = true`, so they still render correctly.
 * To change this, either widen `ALPHABET` above, or add
 * `export const dynamicParams = false` to return 404 for unknown letters.
 */
export function generateStaticParams(): { locale: Locale; letter: string }[] {
  return SUPPORTED_LOCALES.flatMap((locale) => ALPHABET.map((letter) => ({ locale, letter })));
}

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
    <PageLayout
      title={t('letterPage.title', { letter: upperLetter })}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/glossary' }, { label: upperLetter }]}
    >
      <SectionTitle>{t('letterPage.termsTitle')}</SectionTitle>

      <GlossaryTermList terms={filteredTerms} locale={locale} />

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
        <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
      )}

      <SectionTitle>{t('alphabeticalIndexTitle')}</SectionTitle>

      <AlphabeticalIndex locale={locale} currentLetter={letter.toLowerCase()} />

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
