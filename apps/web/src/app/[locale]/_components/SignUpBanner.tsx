'use client';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { SignUpBannerUI } from './SignUpBannerUI';

type Props = {
  locale: string;
  message: string;
  description: string;
  ctaLabel: string;
};

/**
 * Guest-only sign-up CTA. Auth state is resolved client-side via `useAuth`
 * (nothing renders until the check completes), mirroring the
 * `RankAchievedBadge` / `MembersOnlyBadge` pattern: the previous server-side
 * `getOptionalUser()` read put an auth-cookie dependency into otherwise
 * static/ISR pages (dojo/ranks, leaderboard) and forced them dynamic. The
 * label strings stay resolved by the Server Component caller and arrive as
 * plain props.
 */
export function SignUpBanner({ locale, message, description, ctaLabel }: Props) {
  const { user, isLoading } = useAuth();
  if (isLoading || user) return null;

  return (
    <SignUpBannerUI
      locale={locale}
      message={message}
      description={description}
      ctaLabel={ctaLabel}
    />
  );
}
