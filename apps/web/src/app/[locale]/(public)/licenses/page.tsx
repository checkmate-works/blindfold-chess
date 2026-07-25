import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { LastUpdated } from '@/app/[locale]/_components/LastUpdated';
import { ProseArticle } from '@/app/[locale]/_components/ProseArticle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

export const generateStaticParams = generateLocaleStaticParams;

/** Date this page was last revised (single source of truth, not per-locale). */
const LAST_UPDATED = '2026-05-13';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'licenses', path: 'licenses' });
}

type ComponentEntry = {
  name: string;
  description: string;
  sourceUrl: string;
  license: string;
};

export default async function LicensesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'licenses' });

  const components: ComponentEntry[] = [
    {
      name: t('stockfishName'),
      description: t('stockfishDescription'),
      sourceUrl: 'https://github.com/official-stockfish/Stockfish',
      license: t('licenseValue'),
    },
    {
      name: t('lc0Name'),
      description: t('lc0Description'),
      sourceUrl: 'https://github.com/LeelaChessZero/lc0',
      license: t('licenseValue'),
    },
    {
      name: t('maiaName'),
      description: t('maiaDescription'),
      sourceUrl: 'https://github.com/CSSLab/maia-chess',
      license: t('licenseValue'),
    },
    {
      name: t('libheifName'),
      description: t('libheifDescription'),
      sourceUrl: 'https://github.com/strukturag/libheif',
      license: t('lgplLicenseValue'),
    },
  ];

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <ProseArticle className="space-y-4">
        <SectionTitle>{t('overviewTitle')}</SectionTitle>
        <p>{t('introduction')}</p>

        <SectionTitle>{t('componentsTitle')}</SectionTitle>
        <p>{t('componentsIntro')}</p>

        <ul className="list-none ml-0 space-y-6 not-prose">
          {components.map((c) => (
            <li
              key={c.sourceUrl}
              className="border border-border rounded-md p-4 bg-card text-foreground/90"
            >
              <h3 className="font-semibold text-foreground">{c.name}</h3>
              <p className="mt-2 text-sm">{c.description}</p>
              <dl className="mt-3 text-sm space-y-1">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">{t('sourceCodeLabel')}</dt>
                  <dd>
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={TEXT_LINK_MUTED_CLASSES}
                    >
                      {c.sourceUrl}
                    </a>
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">{t('licenseLabel')}</dt>
                  <dd>{c.license}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <SectionTitle>{t('complianceTitle')}</SectionTitle>
        <p>{t('complianceIntro')}</p>
        <p>{t('lgplComplianceNote')}</p>
        <p>
          <a
            href="/licenses/gpl-3.0.txt"
            target="_blank"
            rel="noopener noreferrer"
            className={TEXT_LINK_MUTED_CLASSES}
          >
            {t('viewFullLicense')}
          </a>
          {' / '}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className={TEXT_LINK_MUTED_CLASSES}
          >
            {t('viewFullLicenseGnu')}
          </a>
        </p>

        <div className="text-right">
          <LastUpdated locale={locale} date={LAST_UPDATED} />
        </div>
      </ProseArticle>
      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
