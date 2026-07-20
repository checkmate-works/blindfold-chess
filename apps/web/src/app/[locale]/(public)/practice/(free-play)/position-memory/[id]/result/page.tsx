import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { getExpInfoBySource } from '@/lib/db/get-exp-info-by-source';
import { getPositionLikeMeta } from '@/lib/positions/like-queries';
import { getPositionWithProfileById } from '@/lib/positions/queries';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthorName } from '@/lib/users/display-name';
import { UUID_RE } from '@/lib/validations/uuid';

import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SinglePositionResult } from '../../_components/single-position/SinglePositionResult';
import { SinglePositionResultLoadingSkeleton } from '../../_components/single-position/SinglePositionResultLoadingSkeleton';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory' }),
    title: resolveTitle(`${t('title')} - ${t('result')}`, locale),
  };
}

export default async function PositionResultPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'practice.positionMemory' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale, namespace: 'Common' });

  const sp = await searchParams;
  const grantRaw = sp.grant;
  const grant = typeof grantRaw === 'string' ? grantRaw : undefined;

  // Resolve EXP info server-side via ?grant=<exp_event_id> so the display
  // survives reloads and direct URL access. Mirrors the challenge flow's
  // `resolveExpInfoFromGrantParam` helper in createPracticeResultPage.
  let expInfo = null;
  if (grant) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      expInfo = await getExpInfoBySource(user.id, 'practice_result', grant);
    }
  }

  // Tolerant of a missing/soft-deleted position (unlike the puzzle result
  // page, which 404s) — the breadcrumb and result panel already render
  // without it; the like CTA / attribution row below simply stays hidden
  // in that case too.
  const row = await getPositionWithProfileById({ id, type: 'memory' });
  const position = row?.position;
  const displayName = row
    ? resolveAuthorName(row.profile, { fallback: tCommon('deletedUser') })
    : undefined;

  const currentUser = await getOptionalUser();
  const likeMeta = position ? await getPositionLikeMeta(position.id, currentUser?.id) : undefined;

  const adBannerStandard = <AdSlot slot="content-bottom" />;

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: tNav('practice'), href: '/practice' },
        { label: t('list.title'), href: '/practice/position-memory' },
        ...(position ? [{ label: position.title, href: `/practice/position-memory/${id}` }] : []),
        { label: t('result') },
      ]}
      locale={locale}
      density="compact"
    />
  );

  return (
    // Fallback covers the soft-navigation gap between loading.tsx resolving and
    // the SinglePositionResult client chunk arriving. That component owns the
    // PagePanel chrome, so without a fallback the page would flash to bare
    // background. Reuse the same skeleton as loading.tsx for a continuous shape.
    <Suspense fallback={<SinglePositionResultLoadingSkeleton grantsExp />}>
      <SinglePositionResult
        locale={locale}
        sessionPath={`/practice/position-memory/${id}/session`}
        adBannerStandard={adBannerStandard}
        breadcrumb={breadcrumb}
        expInfo={expInfo}
        positionId={position?.id}
        profile={row?.profile}
        displayName={displayName}
        initialLikeCount={likeMeta?.likeCount}
        initialLikedByMe={likeMeta?.likedByMe}
      />
    </Suspense>
  );
}
