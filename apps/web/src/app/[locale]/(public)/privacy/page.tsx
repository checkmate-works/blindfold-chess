import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { LastUpdated } from '@/app/[locale]/_components/LastUpdated';
import { ProseArticle } from '@/app/[locale]/_components/ProseArticle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

export const generateStaticParams = generateLocaleStaticParams;

/** Date this policy was last revised (single source of truth, not per-locale). */
const LAST_UPDATED = '2026-09-19';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'privacy', path: 'privacy' });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tAffiliate] = await Promise.all([
    getTranslations({ locale, namespace: 'privacy' }),
    getTranslations({ locale, namespace: 'affiliateDisclosure' }),
  ]);

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <ProseArticle className="space-y-4">
        <SectionTitle>{t('title')}</SectionTitle>
        <p>{t('introduction')}</p>

        <SectionTitle>{t('cookiesTitle')}</SectionTitle>
        <p>{t('cookiesDescription')}</p>

        <SectionTitle>{t('analyticsTitle')}</SectionTitle>
        <p>{t('analyticsDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('analyticsItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('analyticsItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('analyticsItem3')}</li>
        </ul>
        <p>
          {t('analyticsPrivacyPolicy')}{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={TEXT_LINK_MUTED_CLASSES}
          >
            {t('googlePrivacyPolicyLink')}
          </a>
        </p>
        <p>{t('analyticsConsent')}</p>

        <SectionTitle>{t('advertisingTitle')}</SectionTitle>
        <p>{t('advertisingDescription')}</p>
        <p>
          {t('advertisingLearnMore')}{' '}
          <Link
            href={`/${locale}/affiliate-disclosure`}
            prefetch={false}
            className={TEXT_LINK_MUTED_CLASSES}
          >
            {tAffiliate('title')}
          </Link>
        </p>

        <SectionTitle>{t('localStorageTitle')}</SectionTitle>
        <p>{t('localStorageDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('localStorageItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('localStorageItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('localStorageItem3')}</li>
        </ul>
        <p>{t('localStorageNote')}</p>

        <SectionTitle>{t('personalDataTitle')}</SectionTitle>
        <p>{t('personalDataDescription')}</p>

        <SectionTitle>{t('thirdPartyLinksTitle')}</SectionTitle>
        <p>{t('thirdPartyLinksDescription')}</p>

        <SectionTitle>{t('childrenPrivacyTitle')}</SectionTitle>
        <p>{t('childrenPrivacyDescription')}</p>

        <SectionTitle>{t('yourRightsTitle')}</SectionTitle>
        <p>{t('yourRightsDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('yourRightsItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('yourRightsItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('yourRightsItem3')}</li>
          <li className="text-foreground/90 pl-2">{t('yourRightsItem4')}</li>
        </ul>

        <SectionTitle>{t('cookieDetailsTitle')}</SectionTitle>
        <p>{t('cookieDetailsDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('cookieDetailsItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('cookieDetailsItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('cookieDetailsItem3')}</li>
        </ul>
        <p>{t('cookieDetailsNote')}</p>

        <SectionTitle>{t('dataRetentionTitle')}</SectionTitle>
        <p>{t('dataRetentionDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('dataRetentionItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('dataRetentionItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('dataRetentionItem3')}</li>
        </ul>

        <SectionTitle>{t('changesTitle')}</SectionTitle>
        <p>{t('changesDescription')}</p>

        <div className="text-right">
          <LastUpdated locale={locale} date={LAST_UPDATED} />
        </div>
      </ProseArticle>
    </PageLayout>
  );
}
