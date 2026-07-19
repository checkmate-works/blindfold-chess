import type { ReactNode } from 'react';

import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PositionActionsMenuItem } from './PositionActionsMenu';
import { PositionActionsMenu } from './PositionActionsMenu';

type ProfileLike = {
  username?: string | null;
  avatarUrl?: string | null;
} | null;

type Props = {
  /** Profile of the author. May be null for anonymous / deleted users. */
  profile: ProfileLike;
  /** Pre-resolved display name (use `resolveDisplayName(profile)` at the call site). */
  displayName: string;
  /**
   * Small caption above the avatar row, e.g. translated "Created by" — makes
   * the block read as author attribution even when it sits away from the
   * content's top (Medium's end-of-article "Written by" pattern).
   */
  createdByLabel: string;
  locale: Locale;
  createdAt: Date;
  /** Renders the translated `editedLabel` next to the date when true. */
  edited?: boolean;
  editedLabel?: string;
  /** Accessible label for the "⋯" menu trigger, e.g. translated "More actions". */
  menuAriaLabel?: string;
  /** Owner/viewer link actions (edit, fork). The "⋯" menu is hidden when empty. */
  menuItems?: PositionActionsMenuItem[];
  /**
   * Fully custom "⋯" menu node — takes precedence over `menuItems`. Use when
   * menu visibility or entries depend on client-side state (e.g. the shared
   * game's token-based ownership) by passing a client component that renders
   * `PositionActionsMenu` itself (or nothing).
   */
  menu?: ReactNode;
};

/**
 * SNS-style author header for content detail pages: a "Created by" caption,
 * then avatar and author name with the creation date underneath (the familiar
 * two-line post header from X / Instagram), and a "⋯" overflow menu on the
 * right holding owner/viewer actions.
 */
export function PositionAuthorHeader({
  profile,
  displayName,
  createdByLabel,
  locale,
  createdAt,
  edited = false,
  editedLabel,
  menuAriaLabel,
  menuItems = [],
  menu,
}: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{createdByLabel}</p>
      <div className="flex items-center justify-between gap-4">
        <UserAvatar
          profileHref={profile?.username ? `/u/${profile.username}` : null}
          avatarUrl={profile?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="sm"
          layout="block"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={createdAt.toISOString()}>
              {createdAt.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {edited && editedLabel && <span>{editedLabel}</span>}
          </div>
        </UserAvatar>
        {menu ??
          (menuItems.length > 0 && menuAriaLabel && (
            <PositionActionsMenu ariaLabel={menuAriaLabel} items={menuItems} />
          ))}
      </div>
    </div>
  );
}
