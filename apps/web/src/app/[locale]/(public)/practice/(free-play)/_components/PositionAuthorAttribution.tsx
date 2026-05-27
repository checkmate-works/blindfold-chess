import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
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
 * Avatar rendering is delegated to the unified `UserAvatar` component
 * (`size="xs"`, `layout="inline"`). The wrapper still owns the
 * `createdByLabel` prefix and the right-aligned positioning specific to
 * this attribution row.
 */
export function PositionAuthorAttribution({ profile, displayName, createdByLabel, locale }: Props) {
  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <span>{createdByLabel}</span>
      <UserAvatar
        profileHref={profile?.username ? `/u/${profile.username}` : null}
        avatarUrl={profile?.avatarUrl}
        displayName={displayName}
        locale={locale}
        size="xs"
        layout="inline"
      />
    </div>
  );
}
