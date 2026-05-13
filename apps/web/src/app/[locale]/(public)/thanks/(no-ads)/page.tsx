import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { and, eq } from 'drizzle-orm';

import { db, pointEvents } from '@/lib/db';
import { POST_MATURATION_DAYS, type PointSource } from '@/lib/points';
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

/**
 * Map a `point_events.source` value to the explanation i18n key. Falls
 * through to `'default'` for unknown sources so the page stays graceful.
 */
function explanationKeyFor(source: string): string {
  const map: Record<PointSource, string> = {
    puzzle_created: 'pointsExplanation.puzzle_created',
    position_memory_created: 'pointsExplanation.position_memory_created',
    topic_post_created: 'pointsExplanation.topic_post_created',
  };
  return (map as Record<string, string>)[source] ?? 'pointsExplanation.default';
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

  let award: { amount: number; explanationKey: string } | null = null;
  if (user && pointEventId) {
    const [row] = await db
      .select({
        amount: pointEvents.delta,
        source: pointEvents.source,
      })
      .from(pointEvents)
      .where(and(eq(pointEvents.id, pointEventId), eq(pointEvents.userId, user.id)))
      .limit(1);

    if (row && row.amount > 0) {
      award = {
        amount: row.amount,
        explanationKey: explanationKeyFor(row.source),
      };
    }
  }

  return (
    <PageLayout title={t('title')} locale={locale}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {award ? (
        <div className="space-y-4">
          <p className="text-foreground">{t(award.explanationKey)}</p>
          <CertificateFrame>
            <p className="text-base sm:text-2xl font-serif font-bold text-podium-gold-foreground tracking-widest text-center">
              {t('pointsAward', { amount: award.amount })}
            </p>
          </CertificateFrame>
          <p className="text-sm text-muted-foreground text-center">
            {t('maturationNote', { days: POST_MATURATION_DAYS })}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-4">{t('genericMessage')}</p>
      )}

      <div className="flex flex-col gap-3 pb-4">
        <Link href={returnUrl} className="block">
          <Button asChild variant="primary" size="lg" fullWidth>
            {t('continueButton')}
          </Button>
        </Link>
        <Link href={`/${locale}/mypage/benefits`} className="block">
          <Button asChild variant="outline" size="lg" fullWidth>
            {t('viewBenefitsButton')}
          </Button>
        </Link>
      </div>
    </PageLayout>
  );
}
