import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { getModuleWeight } from '@blindfold-chess/features/exp';

import { DAILY_CREATION_POINT_CAP, POST_CREATION_POINTS } from '@/lib/points';
import { resolveCspNonce } from '@/lib/security/nonce';
import { JsonLd, generateFAQPageSchema } from '@/lib/seo/jsonld';

import { PageLayout } from '@/app/[locale]/_components';
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'faq', path: 'faq' });
}

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'faq' });
  const nonce = await resolveCspNonce();

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
    {
      id: 'ad-free-benefits',
      question: t('items.adFreeBenefits.question'),
      answer: (
        <div className="space-y-4">
          <p>{t('items.adFreeBenefits.answer')}</p>

          <h3 className="font-medium text-foreground">{t('items.adFreeBenefits.tableTitle')}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium py-1.5 px-2">
                  {t('items.adFreeBenefits.headerAction')}
                </th>
                <th className="text-left text-muted-foreground font-medium py-1.5 px-2">
                  {t('items.adFreeBenefits.headerPoints')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(['topic_post', 'position_creation'] as const).map((action) => (
                <tr key={action} className="border-b border-border">
                  <td className="py-1.5 px-2">{t(`items.adFreeBenefits.actions.${action}`)}</td>
                  <td className="py-1.5 px-2">
                    {t('items.adFreeBenefits.pointsAmount', {
                      amount: POST_CREATION_POINTS,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground">
            {t('items.adFreeBenefits.dailyCapNote', { cap: DAILY_CREATION_POINT_CAP })}
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* NOTE: FAQPage rich results are limited to government/healthcare sites since Aug 2023.
          Keeping schema for semantic markup purposes, but no rich result expected. */}
      <JsonLd data={generateFAQPageSchema(faqSchemaItems)} nonce={nonce} />
      <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
        <FAQClient items={faqItems} />

        <AdSlot slot="content-bottom" />
      </PageLayout>
    </>
  );
}
