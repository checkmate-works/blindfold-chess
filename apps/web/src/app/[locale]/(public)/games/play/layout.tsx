import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/resolve-locale';

import { buildPageTitle, generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
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

export default function PlayLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
