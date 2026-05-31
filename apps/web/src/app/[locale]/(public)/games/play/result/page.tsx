import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { PageLayout } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { BreadcrumbContent } from '@/app/[locale]/_components/Breadcrumb';
import { Divider } from '@/app/[locale]/_components/Divider';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './_components/ResultClient';
import { ResultSkeleton } from './_components/ResultSkeleton';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'play' });

  const title = t('resultTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/play/result', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function ResultPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });
  const tPlay = await getTranslations({ locale, namespace: 'play' });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = tPlay('certificate.guestName');
  if (user) {
    const [profile] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (profile?.displayName) {
      displayName = profile.displayName;
    }
  }

  const breadcrumb = (
    <BreadcrumbContent
      items={[{ label: tGames('pageTitle'), href: '/games' }, { label: tPlay('gameOver') }]}
      locale={locale}
      brandName={tMetadata('siteName')}
      density="compact"
    />
  );

  return (
    <PageLayout title={tPlay('resultTitle')} locale={locale}>
      <Suspense fallback={<ResultSkeleton />}>
        <ResultClient locale={locale} displayName={displayName} isAuthenticated={Boolean(user)} />
      </Suspense>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}

      {/* Breadcrumb sits below the content-bottom ad, matching the standard
          PageLayout trailing block (content → ad → divider+breadcrumb). It is
          rendered here rather than inside ResultClient so the ad stays above
          it. `!mt-4` halves the panel's `space-y-8` gap; the inner `space-y-4`
          groups the divider with the breadcrumb. */}
      <div className="!mt-4 space-y-4">
        <Divider />
        {breadcrumb}
      </div>
    </PageLayout>
  );
}
