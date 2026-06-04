/**
 * Onboarding · Profile Step (オンボーディング・プロフィール設定)
 *
 * @description
 * First onboarding step shown right after a user completes registration
 * (本登録) on `setup-username`. It nudges — but never forces — the user to set
 * the two profile fields that are most often left blank in production: avatar
 * and country. Both CTAs ("save and start" / "set up later") land on `/mypage`.
 *
 * @flow
 * setup-username (本登録 success) → router.push(onboarding/profile) → /mypage
 *
 * Entry is the one-time post-registration redirect, so the step naturally shows
 * once; there is intentionally no completion flag or layout guard (kept optional
 * by design — country/avatar must not be mandatory).
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { OnboardingProfileForm } from './_components';

type Props = LocalePageProps;

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'onboardingProfile',
    path: 'mypage/onboarding/profile',
    titleKey: 'sectionTitle',
    omitDescription: true,
    noIndex: true,
  });
}

export default async function OnboardingProfilePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboardingProfile' });
  const tSignUp = await getTranslations({ locale, namespace: 'signUp' });

  const user = await getAuthenticatedUser();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  if (!profile) {
    notFound();
  }

  return (
    <PageLayout
      title={
        <>
          {tSignUp('title')}
          <span className="ml-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success align-middle">
            {tSignUp('freeBadge')}
          </span>
        </>
      }
      locale={locale}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      <div className="space-y-6">
        <div className="space-y-1 text-center">
          <p className="font-medium text-foreground">{t('completed')}</p>
          <p className="text-sm text-muted-foreground">{t('prompt')}</p>
        </div>

        <OnboardingProfileForm
          locale={locale}
          currentAvatarUrl={profile.avatarUrl}
          currentCountry={profile.country}
          currentBio={profile.bio}
        />
      </div>
    </PageLayout>
  );
}
