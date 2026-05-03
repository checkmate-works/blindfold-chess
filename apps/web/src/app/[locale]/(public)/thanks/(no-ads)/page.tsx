import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { and, eq, isNull } from 'drizzle-orm';

import { db, topicPosts, userGrants } from '@/lib/db';
import { isTopicPostGrantTopicType } from '@/lib/db/data/grant-types';
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
  const grantId = typeof sp.grantId === 'string' ? sp.grantId : '';
  const returnUrlRaw = typeof sp.returnUrl === 'string' ? sp.returnUrl : '';
  const returnUrl = isSafeReturnPath(returnUrlRaw) ? returnUrlRaw : `/${locale}`;

  const t = await getTranslations({ locale, namespace: 'thanks' });

  // Resolve grant details with auth + ownership filter. Anonymous visitors
  // and mismatched users get the generic message; the page never reveals
  // another user's grant. durationDays is computed from `expiresAt - startsAt`
  // rather than looked up in `GRANT_TYPE_DEFAULTS` so this page works for
  // any grant type (including admin_manual) without a per-type lookup.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let benefit: {
    type: string;
    durationDays: number;
    /** Source topic_type when the grant was triggered by a topic_post; null otherwise. */
    topicType: string | null;
  } | null = null;
  if (user && grantId) {
    const [grant] = await db
      .select({
        benefitType: userGrants.benefitType,
        startsAt: userGrants.startsAt,
        expiresAt: userGrants.expiresAt,
        sourceType: userGrants.sourceType,
        sourceId: userGrants.sourceId,
      })
      .from(userGrants)
      .where(
        and(
          eq(userGrants.id, grantId),
          eq(userGrants.userId, user.id),
          isNull(userGrants.revokedAt)
        )
      )
      .limit(1);

    if (grant) {
      const durationMs = grant.expiresAt.getTime() - grant.startsAt.getTime();
      const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

      // Resolve the source surface (e.g., square/opening/position_memory/
      // position_puzzle) so the explanation copy can be specific. Done as a
      // second tiny query rather than a join because `userGrants.sourceId`
      // is varchar and `topicPosts.id` is uuid — keeping the type-safe
      // equality on a single column avoids cross-type cast juggling.
      let topicType: string | null = null;
      if (grant.sourceType === 'topic_post' && grant.sourceId) {
        const [post] = await db
          .select({ topicType: topicPosts.topicType })
          .from(topicPosts)
          .where(eq(topicPosts.id, grant.sourceId))
          .limit(1);
        topicType = post?.topicType ?? null;
      }

      benefit = { type: grant.benefitType, durationDays, topicType };
    }
  }

  // Pick the explanation copy based on the resolved source surface; fall back
  // to a generic phrasing when the surface is unknown (e.g., admin_manual
  // grants reaching this page via a hand-crafted URL, or future grant types).
  const explanationKey =
    benefit && benefit.topicType && isTopicPostGrantTopicType(benefit.topicType)
      ? `explanation.${benefit.topicType}`
      : 'explanation.default';

  return (
    <PageLayout title={t('title')} locale={locale}>
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      {benefit ? (
        <div className="space-y-4">
          <p className="text-foreground">{t(explanationKey)}</p>
          <CertificateFrame>
            <p className="text-base sm:text-2xl font-serif font-bold text-podium-gold-foreground tracking-widest text-center">
              {t(`benefits.${benefit.type}`, { days: benefit.durationDays })}
            </p>
          </CertificateFrame>
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
