import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, metaT] = await Promise.all([
    getTranslations({ locale, namespace: 'metadata.play' }),
    getTranslations({ locale, namespace: 'metadata' }),
  ]);

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play', title, description }),
    title: {
      default: title,
      template: `%s | ${title} | ${metaT('seoSiteName')}`,
    },
    description,
  };
}

export default function PlayLayout({ children }: Props) {
  return <>{children}</>;
}
