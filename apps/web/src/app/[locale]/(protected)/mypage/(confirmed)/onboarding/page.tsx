/**
 * Onboarding Wizard (オンボーディング・4ステップ)
 *
 * @description
 * Post-registration onboarding shown right after a user completes 本登録 on
 * setup-username. A single 4-step wizard: (1) profile (avatar/country/bio),
 * (2) help-tour explainer, (3) play a game, (4) the Dojo curriculum. Optional
 * throughout — the skip link and the final "done" both land on /mypage.
 *
 * @flow
 * setup-username (本登録 success) → router.push(mypage/onboarding) → /mypage
 *
 * Entry is the one-time post-registration redirect, so the wizard naturally
 * shows once; there is intentionally no completion flag or layout guard
 * (profile fields must not be mandatory).
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { OnboardingWizard } from './_components';
import { BeltRanksSlide } from './_components/BeltRanksSlide';

type Props = LocalePageProps;

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'onboardingWizard',
    path: 'mypage/onboarding',
    titleKey: 'pageTitle',
    omitDescription: true,
    noIndex: true,
  });
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboardingWizard' });

  const user = await getAuthenticatedUser();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  if (!profile) {
    notFound();
  }

  return (
    <PageLayout title={t('pageTitle')} locale={locale}>
      <OnboardingWizard
        locale={locale}
        currentAvatarUrl={profile.avatarUrl}
        currentCountry={profile.country}
        currentBio={profile.bio}
        beltSlide={<BeltRanksSlide locale={locale} />}
      />
    </PageLayout>
  );
}
