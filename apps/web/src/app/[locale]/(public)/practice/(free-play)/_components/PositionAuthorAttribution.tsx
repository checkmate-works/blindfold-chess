import Image from 'next/image';

import { Link } from '@/i18n/routing';

import type { Locale } from '@/app/[locale]/_lib/types';

type ProfileLike = {
  username?: string | null;
  avatarUrl?: string | null;
} | null;

type Props = {
  /** Profile of the author. May be null for anonymous / deleted users. */
  profile: ProfileLike;
  /** Pre-resolved display name (use `resolveDisplayName(profile)` at the call site). */
  displayName: string;
  /** Label shown before the author badge, e.g. translated "Created by". */
  createdByLabel: string;
  locale: Locale;
};

/**
 * Author attribution block shared between the position-memory and puzzle
 * detail pages. Renders the "Created by" prefix together with an avatar (or
 * a single-letter fallback) and the display name. When the author has a
 * username, the whole avatar + name segment links to their profile.
 *
 * Identical markup was previously duplicated in both detail pages; extract
 * here to give a single owner for the avatar fallback styling and the
 * username link behaviour. Avatar rendering is deliberately kept inline
 * (instead of `UserAvatar`) because adopting that component requires a
 * separate API change tracked in another ticket.
 */
export function PositionAuthorAttribution({ profile, displayName, createdByLabel, locale }: Props) {
  const badge = (
    <>
      {profile?.avatarUrl ? (
        <Image
          src={profile.avatarUrl}
          alt={displayName}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className={`font-medium text-foreground${profile?.username ? ' hover:underline' : ''}`}>
        {displayName}
      </span>
    </>
  );

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <span>{createdByLabel}</span>
      {profile?.username ? (
        <Link
          href={`/u/${profile.username}`}
          locale={locale}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {badge}
        </Link>
      ) : (
        badge
      )}
    </div>
  );
}
