import { getTranslations } from 'next-intl/server';

import { PageTitle } from '../_components';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.company' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'company' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>

      <div className="bg-card rounded-lg shadow-lg p-6 md:p-8 space-y-8">
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
      </div>
    </>
  );
}
