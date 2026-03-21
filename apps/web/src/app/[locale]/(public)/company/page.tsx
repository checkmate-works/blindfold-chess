import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata.company' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'company' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'company' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>

      <PagePanel>
        {/* Company Information */}
        <section>
          <dl className="space-y-4">
            <div className="border-b border-border pb-4">
              <dt className="text-sm font-semibold text-muted-foreground mb-1">
                {t('companyName')}
              </dt>
              <dd className="text-base text-foreground">{t('companyNameValue')}</dd>
            </div>

            <div className="border-b border-border pb-4">
              <dt className="text-sm font-semibold text-muted-foreground mb-1">{t('location')}</dt>
              <dd className="text-base text-foreground">
                {t('postalCode')}
                <br />
                {t('address')}
              </dd>
            </div>

            <div className="border-b border-border pb-4">
              <dt className="text-sm font-semibold text-muted-foreground mb-1">{t('business')}</dt>
              <dd className="text-base text-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('businessItem1')}</li>
                  <li>{t('businessItem2')}</li>
                  <li>{t('businessItem3')}</li>
                  <li>{t('businessItem4')}</li>
                </ul>
              </dd>
            </div>
          </dl>
        </section>

        {/* Corporate Website Link */}
        <section className="bg-muted/30 rounded-md p-4">
          <p className="text-sm text-muted-foreground">
            {t('moreInfo')}{' '}
            <a
              href="https://www.fuji.llc/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {t('corporateWebsite')}
            </a>
          </p>
        </section>
      </PagePanel>
    </>
  );
}
