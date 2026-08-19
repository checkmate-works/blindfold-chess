import type { ReactNode } from 'react';

import Link from 'next/link';

import { formatLocalDate } from '@/lib/i18n/format-date';
import { buildProfileHref } from '@/lib/users/author-profile';

import type { ActionsMenuItem } from '@/app/[locale]/_components/ActionsMenu';
import { ActionsMenu } from '@/app/[locale]/_components/ActionsMenu';
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
  /**
   * When set, `editedLabel` links here (the position's `/history` page)
   * instead of rendering as plain text. Locale-prefixed, like `menuItems`
   * hrefs (e.g. `/${locale}/practice/puzzle/${id}/history`). Omit for
   * content types with no edit-history page (repertoires, chunks) — the
   * label still renders, just without a link.
   */
  editedHref?: string;
  /** Accessible label for the "⋯" menu trigger, e.g. translated "More actions". */
  menuAriaLabel?: string;
  /** Owner/viewer link actions (edit, fork). The "⋯" menu is hidden when empty. */
  menuItems?: ActionsMenuItem[];
  /**
   * Fully custom "⋯" menu node — takes precedence over `menuItems`. Use when
   * menu visibility or entries depend on client-side state (e.g. the shared
   * game's token-based ownership) by passing a client component that renders
   * `ActionsMenu` itself (or nothing).
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
  editedHref,
  menuAriaLabel,
  menuItems = [],
  menu,
}: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{createdByLabel}</p>
      <div className="flex items-center justify-between gap-4">
        <UserAvatar
          profileHref={buildProfileHref(profile)}
          avatarUrl={profile?.avatarUrl}
          displayName={displayName}
          locale={locale}
          size="sm"
          layout="block"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <time dateTime={createdAt.toISOString()}>
              {formatLocalDate(createdAt, locale, 'long')}
            </time>
            {edited && editedLabel && editedHref && (
              <Link href={editedHref} className="hover:text-foreground hover:underline">
                {editedLabel}
              </Link>
            )}
            {edited && editedLabel && !editedHref && <span>{editedLabel}</span>}
          </div>
        </UserAvatar>
        {menu ??
          (menuItems.length > 0 && menuAriaLabel && (
            <ActionsMenu ariaLabel={menuAriaLabel} items={menuItems} />
          ))}
      </div>
    </div>
  );
}
