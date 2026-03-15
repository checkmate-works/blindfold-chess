import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'privacy' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-4">
          <p className="text-muted-foreground">{t('lastUpdated')}</p>
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
              className="underline text-muted-foreground hover:text-foreground"
            >
              {t('googlePrivacyPolicyLink')}
            </a>
          </p>

          <SectionTitle>{t('adsenseTitle')}</SectionTitle>
          <p>{t('adsenseDescription')}</p>
          <ul className="list-disc ml-6 space-y-2">
            <li className="text-foreground/90 pl-2">{t('adsenseItem1')}</li>
            <li className="text-foreground/90 pl-2">{t('adsenseItem2')}</li>
            <li className="text-foreground/90 pl-2">{t('adsenseItem3')}</li>
          </ul>
          <p>
            {t('adsenseOptOut')}{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-muted-foreground hover:text-foreground"
            >
              {t('adsSettingsLink')}
            </a>
          </p>
          <p>
            {t('adsenseLearnMore')}{' '}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-muted-foreground hover:text-foreground"
            >
              {t('partnerSitesLink')}
            </a>
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
        </article>

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
