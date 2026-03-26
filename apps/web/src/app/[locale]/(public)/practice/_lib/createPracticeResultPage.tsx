import { type ComponentType, type ReactNode, Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type MetadataConfig = {
  i18nKey: string;
  canonicalPath: string;
};

type MetadataProps = {
  params: Promise<{ locale: Locale }>;
};

export function createPracticeResultMetadata(config: MetadataConfig) {
  return async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'practice' });
    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: `${t(`${config.i18nKey}.title`)} - ${t('result')}`,
    };
  };
}

type SimpleResultClientProps = {
  locale: Locale;
  adBanner?: ReactNode;
};

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export function createSimplePracticeResultPage(
  ResultClient: ComponentType<SimpleResultClientProps>
) {
  return async function Page(props: PageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    return (
      <>
        <Suspense>
          <ResultClient locale={locale} adBanner={<AdBannerGuard slot="banner-wide" />} />
        </Suspense>
        <AdBannerGuard slot="banner-standard" />
      </>
    );
  };
}
