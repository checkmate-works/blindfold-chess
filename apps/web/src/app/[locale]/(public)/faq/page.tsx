import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import {
  MISS_BONUS,
  NO_ACCURACY_BONUS_MULTIPLIER,
  getModuleWeight,
} from '@blindfold-chess/features/exp';

import { JsonLd, generateFAQPageSchema } from '@/lib/seo/jsonld';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { FAQClient } from './_components/FAQClient';
import type { FAQItem } from './_lib/types';

export const generateStaticParams = generateLocaleStaticParams;

/**
 * Display order for the EXP module-weight table. Kept separate from
 * `MODULE_WEIGHT` so the FAQ can present modules in an editorial order
 * (lightweight → specialty) independent of the data source.
 */
const WEIGHT_DISPLAY_ORDER = [
  'coordinate_quiz',
  'square_colors',
  'legal_moves',
  'board_symmetry',
  'position_memory',
  'diagonal_quiz',
  'route_planner',
] as const;

/**
 * Rows of the accuracy-bonus table: one per rung of the Exp bonus ladder, plus
 * the row the ladder itself does not carry. `MISS_BONUS` stops at the last rung
 * that still earns a bonus; any higher miss count — today the 3-miss burst —
 * falls through to `NO_ACCURACY_BONUS_MULTIPLIER`, so that row is derived from
 * the last rung rather than written out. Adding or removing a rung then moves
 * the table with it instead of leaving it quietly showing stale multipliers.
 */
const ACCURACY_BONUS_ROWS: { misses: number; multiplier: number }[] = [
  ...MISS_BONUS,
  {
    misses: (MISS_BONUS.at(-1)?.misses ?? -1) + 1,
    multiplier: NO_ACCURACY_BONUS_MULTIPLIER,
  },
];

/**
 * Formats a multiplier the way the table reads it: always at least one decimal
 * place, so 1 renders as `×1.0` alongside `×1.5`, and never rounded away, so a
 * two-decimal rung would print in full instead of collapsing onto its
 * neighbour.
 */
function formatMultiplier(multiplier: number): string {
  const decimals = (multiplier.toString().split('.')[1] ?? '').length;
  return `×${multiplier.toFixed(Math.max(1, decimals))}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'faq', path: 'faq' });
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
    {
      question: t('items.adFreeBenefits.question'),
      answer: stripTags(t.raw('items.adFreeBenefits.answer')),
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
              {WEIGHT_DISPLAY_ORDER.map((key) => (
                <tr key={key} className="border-b border-border">
                  <td className="py-1.5 px-2">{t(`items.expSystem.modules.${key}`)}</td>
                  <td className="py-1.5 px-2">{getModuleWeight(key).toString()}</td>
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
              {ACCURACY_BONUS_ROWS.map(({ misses, multiplier }) => {
                // Miss-count labels carry a per-locale annotation ("0 (Perfect)",
                // "3 (Burst)") that a bare number cannot express, so they stay in
                // the messages. A rung added ahead of its translation falls back
                // to the plain count rather than rendering an undefined key.
                const labelKey = `items.expSystem.misses${misses}`;
                return (
                  <tr key={misses} className="border-b border-border">
                    <td className="py-1.5 px-2">
                      {t.has(labelKey) ? t(labelKey) : misses.toString()}
                    </td>
                    <td className="py-1.5 px-2">{formatMultiplier(multiplier)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'ad-free-benefits',
      question: t('items.adFreeBenefits.question'),
      answer: (
        <div className="space-y-3">
          <p>{t('items.adFreeBenefits.answer')}</p>
          <p className="text-sm text-muted-foreground">{t('items.adFreeBenefits.earnSummary')}</p>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* NOTE: FAQPage rich results are limited to government/healthcare sites since Aug 2023.
          Keeping schema for semantic markup purposes, but no rich result expected. */}
      <JsonLd data={generateFAQPageSchema(faqSchemaItems)} />
      <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
        <SectionTitle>{t('title')}</SectionTitle>
        <FAQClient items={faqItems} />

        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
