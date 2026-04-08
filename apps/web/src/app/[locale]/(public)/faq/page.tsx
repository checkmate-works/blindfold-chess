import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';

import { JsonLd, generateFAQPageSchema } from '@/lib/jsonld';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { FAQClient } from './_components/FAQClient';
import type { FAQItem } from './_lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'faq' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'faq', title, description }),
    title: resolveTitle(title, locale),
    description,
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
    {
      question: t('items.expSystem.question'),
      answer: stripTags(t.raw('items.expSystem.answer')),
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
    {
      id: 'exp-system',
      question: t('items.expSystem.question'),
      answer: (
        <div className="space-y-4">
          <p>{t('items.expSystem.answer')}</p>

          {/* Module Weights */}
          <h3 className="font-medium text-foreground">{t('items.expSystem.moduleWeightTitle')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium py-1.5 px-2">
                  {t('items.expSystem.headerModule')}
                </th>
                <th className="text-left text-muted-foreground font-medium py-1.5 px-2">
                  {t('items.expSystem.headerWeight')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['coordinate_quiz', '1'],
                  ['square_colors', '1'],
                  ['legal_moves', '1.5'],
                  ['board_symmetry', '2.5'],
                  ['diagonal_quiz', '15'],
                  ['route_planner', '15'],
                ] as const
              ).map(([key, weight]) => (
                <tr key={key} className="border-b border-border">
                  <td className="py-1.5 px-2">{t(`items.expSystem.modules.${key}`)}</td>
                  <td className="py-1.5 px-2">{weight}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Accuracy Bonus */}
          <h3 className="font-medium text-foreground">{t('items.expSystem.accuracyBonusTitle')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium py-1.5 px-2">
                  {t('items.expSystem.headerAccuracy')}
                </th>
                <th className="text-left text-muted-foreground font-medium py-1.5 px-2">
                  {t('items.expSystem.headerMultiplier')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['misses0', 'multiplier15'],
                  ['misses1', 'multiplier12'],
                  ['misses2', 'multiplier11'],
                  ['misses3', 'multiplier10'],
                ] as const
              ).map(([missKey, mulKey]) => (
                <tr key={missKey} className="border-b border-border">
                  <td className="py-1.5 px-2">{t(`items.expSystem.${missKey}`)}</td>
                  <td className="py-1.5 px-2">{t(`items.expSystem.${mulKey}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* NOTE: FAQPage rich results are limited to government/healthcare sites since Aug 2023.
          Keeping schema for semantic markup purposes, but no rich result expected. */}
      <JsonLd data={generateFAQPageSchema(faqSchemaItems)} />
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <FAQClient items={faqItems} />

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
