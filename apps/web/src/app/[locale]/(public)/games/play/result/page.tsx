import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { db, profiles } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './_components/ResultClient';

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
  const t = await getTranslations({ locale, namespace: 'play' });
  const tMetadata = await getTranslations({ locale, namespace: 'metadata' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = t('certificate.guestName');
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

  return (
    <div className="space-y-8">
      <PageTitle>{t('resultTitle')}</PageTitle>
      <PagePanel>
        <Suspense>
          <ResultClient
            locale={locale}
            brandName={tMetadata('siteName')}
            displayName={displayName}
          />
        </Suspense>
      </PagePanel>
    </div>
  );
}
