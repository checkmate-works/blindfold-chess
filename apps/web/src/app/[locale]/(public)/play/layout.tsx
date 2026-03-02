import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SITE_NAME } from '@/config';

import { generateCanonicalMetadata } from '../_lib/metadata';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.play' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'play' }),
    title: {
      default: t('title'),
      template: `%s | ${t('title')} | ${SITE_NAME}`,
    },
    description: t('description'),
  };
}

export default function PlayLayout({ children }: Props) {
  return <>{children}</>;
}
