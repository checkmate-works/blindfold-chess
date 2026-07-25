import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.company', path: 'company' });
}

export default async function CompanyPage({ params }: LocalePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'company' });

  return (
    <PageLayout title={t('title')} locale={locale}>
      {/* Company Information */}
      <div className="space-y-2">
        <SectionTitle>{t('companyName')}</SectionTitle>
        <p className="text-base text-foreground">{t('companyNameValue')}</p>
      </div>

      <div className="space-y-2">
        <SectionTitle>{t('location')}</SectionTitle>
        <p className="text-base text-foreground">
          {t('postalCode')}
          <br />
          {t('address')}
        </p>
      </div>

      <div className="space-y-2">
        <SectionTitle>{t('business')}</SectionTitle>
        <ul className="list-disc list-inside space-y-1 text-base text-foreground">
          <li>{t('businessItem1')}</li>
          <li>{t('businessItem2')}</li>
          <li>{t('businessItem3')}</li>
          <li>{t('businessItem4')}</li>
        </ul>
      </div>

      {/* Corporate Website Link */}
      <section className="bg-muted/30 rounded-md p-4">
        <p className="text-sm text-muted-foreground">
          {t('moreInfo')}{' '}
          <a
            href="https://www.fuji.llc/"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium ${TEXT_LINK_CLASSES}`}
          >
            {t('corporateWebsite')}
          </a>
        </p>
      </section>
    </PageLayout>
  );
}
