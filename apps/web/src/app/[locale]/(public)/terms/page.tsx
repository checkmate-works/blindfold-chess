import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'terms' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'terms', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'terms' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <article className="prose prose-slate dark:prose-invert max-w-none space-y-4">
        <p className="text-muted-foreground">{t('lastUpdated')}</p>

        <SectionTitle>{t('acceptanceTitle')}</SectionTitle>
        <p>{t('acceptanceDescription')}</p>

        <SectionTitle>{t('serviceDescriptionTitle')}</SectionTitle>
        <p>{t('serviceDescriptionContent')}</p>

        <SectionTitle>{t('accountRegistrationTitle')}</SectionTitle>
        <p>{t('accountRegistrationDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('accountRegistrationItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('accountRegistrationItem2')}</li>
        </ul>

        <SectionTitle>{t('dataHandlingTitle')}</SectionTitle>
        <p>
          <strong className="font-semibold text-foreground">{t('dataHandlingWarning')}</strong>
        </p>
        <p>{t('dataHandlingDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('dataHandlingItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('dataHandlingItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('dataHandlingItem3')}</li>
          <li className="text-foreground/90 pl-2">{t('dataHandlingItem4')}</li>
          <li className="text-foreground/90 pl-2">{t('dataHandlingItem5')}</li>
        </ul>
        <p>{t('dataHandlingNote')}</p>

        <SectionTitle>{t('userResponsibilitiesTitle')}</SectionTitle>
        <p>{t('userResponsibilitiesDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('userResponsibilitiesItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('userResponsibilitiesItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('userResponsibilitiesItem3')}</li>
        </ul>

        <SectionTitle>{t('prohibitedActivitiesTitle')}</SectionTitle>
        <p>{t('prohibitedActivitiesDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('prohibitedActivitiesItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('prohibitedActivitiesItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('prohibitedActivitiesItem3')}</li>
          <li className="text-foreground/90 pl-2">{t('prohibitedActivitiesItem4')}</li>
        </ul>

        <SectionTitle>{t('intellectualPropertyTitle')}</SectionTitle>
        <p>{t('intellectualPropertyDescription')}</p>

        <SectionTitle>{t('disclaimerTitle')}</SectionTitle>
        <p>{t('disclaimerDescription')}</p>
        <ul className="list-disc ml-6 space-y-2">
          <li className="text-foreground/90 pl-2">{t('disclaimerItem1')}</li>
          <li className="text-foreground/90 pl-2">{t('disclaimerItem2')}</li>
          <li className="text-foreground/90 pl-2">{t('disclaimerItem3')}</li>
        </ul>

        <SectionTitle>{t('limitationOfLiabilityTitle')}</SectionTitle>
        <p>{t('limitationOfLiabilityDescription')}</p>

        <SectionTitle>{t('serviceChangesTitle')}</SectionTitle>
        <p>{t('serviceChangesDescription')}</p>

        <SectionTitle>{t('terminationTitle')}</SectionTitle>
        <p>{t('terminationDescription')}</p>

        <SectionTitle>{t('governingLawTitle')}</SectionTitle>
        <p>{t('governingLawDescription')}</p>

        <SectionTitle>{t('changesTitle')}</SectionTitle>
        <p>{t('changesDescription')}</p>
      </article>
    </PageLayout>
  );
}
