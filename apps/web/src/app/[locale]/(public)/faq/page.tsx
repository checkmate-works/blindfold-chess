import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { JsonLd, generateFAQPageSchema } from '@/lib/jsonld';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FAQClient } from './_components/FAQClient';
import type { FAQItem } from './_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'faq' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'faq' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'faq' });

  // Plain text answers for JSON-LD (strip XML-like tags for plain text)
  const stripTags = (text: string) => text.replace(/<[^>]+>([^<]*)<\/[^>]+>/g, '$1');

  const faqSchemaItems = [
    {
      question: t('items.invalidMove.question'),
      answer: stripTags(t.raw('items.invalidMove.answer')),
    },
    {
      question: t('items.ads.question'),
      answer: stripTags(t.raw('items.ads.answer')),
    },
    {
      question: t('items.chessEngine.question'),
      answer: t('items.chessEngine.answer'),
    },
  ];

  const faqItems: FAQItem[] = [
    {
      id: 'invalid-move',
      question: t('items.invalidMove.question'),
      answer: t.rich('items.invalidMove.answer', {
        settingsLink: (chunks) => (
          <Link
            href="/preferences?tab=game"
            locale={locale}
            className="text-foreground underline hover:opacity-80 transition-colors"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      id: 'ads',
      question: t('items.ads.question'),
      answer: t.rich('items.ads.answer', {
        affiliateLink: (chunks) => (
          <Link
            href="/affiliate-disclosure"
            locale={locale}
            className="text-foreground underline hover:opacity-80 transition-colors"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      id: 'chess-engine',
      question: t('items.chessEngine.question'),
      answer: t('items.chessEngine.answer'),
    },
  ];

  return (
    <div className="space-y-8">
      <JsonLd data={generateFAQPageSchema(faqSchemaItems)} />
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <FAQClient items={faqItems} />

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
