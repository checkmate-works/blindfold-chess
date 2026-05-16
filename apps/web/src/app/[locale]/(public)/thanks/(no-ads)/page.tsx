import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { CoinIcon } from '@blindfold-chess/icons';
import { and, eq } from 'drizzle-orm';

import { db, pointEvents } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

import { CertificateFrame, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-dynamic';

/**
 * Same-origin path validator. Accepts only absolute paths the app itself owns
 * (`/...`) and rejects protocol-relative (`//evil.example.com`) and Windows
 * backslash variants that some browsers historically resolved as schemes.
 * Anything else falls back to the locale root, so a tampered or omitted
 * `returnUrl` cannot be used as an open-redirect.
 */
function isSafeReturnPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'thanks' });
  return {
    title: resolveTitle(t('title'), locale),
    robots: { index: false, follow: false },
  };
}

export default async function ThanksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const pointEventId = typeof sp.pointEventId === 'string' ? sp.pointEventId : '';
  const returnUrlRaw = typeof sp.returnUrl === 'string' ? sp.returnUrl : '';
  const returnUrl = isSafeReturnPath(returnUrlRaw) ? returnUrlRaw : `/${locale}`;

  const t = await getTranslations({ locale, namespace: 'thanks' });

  // Resolve the point grant with auth + ownership filter. Anonymous visitors
  // and mismatched users get the generic message; the page never reveals
  // another user's grant.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let awardedCoins: number | null = null;
  if (user && pointEventId) {
    const [row] = await db
      .select({ amount: pointEvents.delta })
      .from(pointEvents)
      .where(and(eq(pointEvents.id, pointEventId), eq(pointEvents.userId, user.id)))
      .limit(1);

    if (row && row.amount > 0) {
      awardedCoins = row.amount;
    }
  }

  return (
    <PageLayout title={t('title')} locale={locale}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {awardedCoins !== null ? (
        <CertificateFrame>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-2">
              <CoinIcon size={44} aria-hidden="true" />
              <span className="text-3xl font-bold text-podium-gold-foreground">
                ×{awardedCoins}
              </span>
            </div>
            <p className="text-base sm:text-lg font-serif font-bold text-podium-gold-foreground">
              {t('coinsEarned')}
            </p>
          </div>
        </CertificateFrame>
      ) : (
        <p className="text-muted-foreground text-center py-4">{t('genericMessage')}</p>
      )}

      <div className="flex flex-col gap-3 pb-4">
        <Link href={returnUrl} className="block">
          <Button asChild variant="primary" size="lg" fullWidth>
            {t('continueButton')}
          </Button>
        </Link>
        <Link href={`/${locale}/mypage/points`} className="block">
          <Button asChild variant="outline" size="lg" fullWidth>
            {t('viewPointsButton')}
          </Button>
        </Link>
      </div>
    </PageLayout>
  );
}
