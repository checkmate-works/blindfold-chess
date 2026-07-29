import type { ReactNode } from 'react';

import { PositionAuthorHeader } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionAuthorHeader';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  /** Player's profile. Null for anonymous / account-less players. */
  profile: { username?: string | null; avatarUrl?: string | null } | null;
  /** Pre-resolved display name (`resolveDisplayName(profile)`, or a guest fallback). */
  displayName: string;
  /** Translated "Played by" caption. Passed in so this stays namespace-agnostic. */
  playedByLabel: string;
  locale: Locale;
  /** Date under the player's name — when the game was played / published. */
  playedAt: Date;
  /** Owner-only "⋯" overflow menu. Pass `null` when the viewer owns nothing. */
  menu: ReactNode;
  /** Like affordance (real toggle when published, share prompt before that). */
  like: ReactNode;
  /** Share affordance (share menu when published, share prompt before that). */
  share: ReactNode;
};

/**
 * The block below a game replay: the "Played by" author header with its "⋯"
 * menu, then the engagement row (like + share) — the app-wide slot for
 * post-level actions on a UGC detail page.
 *
 * Shared by the published game (`games/shared/[id]`) and the just-finished
 * local game on the result screen (`games/play/result`) so the two read as one
 * page. This component owns only the *layout*; what each slot does differs by
 * page (a published game likes and shares for real, an unpublished one opens
 * the share prompt instead), which is why the three action slots are injected
 * rather than branched on here. Its counterpart above it — the replay itself —
 * is `GameReview`.
 */
export function GameSocialFooter({
  profile,
  displayName,
  playedByLabel,
  locale,
  playedAt,
  menu,
  like,
  share,
}: Props) {
  return (
    <div className="space-y-6">
      {/* SNS-style author block — caption, avatar + name with the date
          underneath, and the "⋯" overflow menu, matching the chunk / position
          UGC pages. */}
      <PositionAuthorHeader
        profile={profile}
        displayName={displayName}
        createdByLabel={playedByLabel}
        locale={locale}
        createdAt={playedAt}
        menu={menu}
      />

      {/* Engagement row. Sharing lives here next to the like (SNS convention),
          i.e. at the end of the content the viewer just read, rather than
          beside the page title, which every other page reserves for the help
          tour. */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {like}
        {share}
      </div>
    </div>
  );
}
