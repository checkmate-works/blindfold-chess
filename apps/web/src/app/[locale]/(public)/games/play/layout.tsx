import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildPageTitle, generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.play' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play', title, description }),
    title: {
      default: title,
      template: `%s | ${buildPageTitle(title, locale)}`,
    },
    description,
  };
}

export default function PlayLayout({ children }: Props) {
  return <>{children}</>;
}
