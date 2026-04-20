import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';

import { buildPageTitle, generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  // Narrow route-segment `locale` (typed as plain string by Next.js) to the
  // supported `Locale` union so `generateCanonicalMetadata` and
  // `buildPageTitle` can index their exhaustive `Record<Locale, _>` maps.
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
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
