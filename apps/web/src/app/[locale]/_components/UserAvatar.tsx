'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';

import { Link, useRouter } from '@/i18n/routing';

import { countryCodeToFlag } from '@/lib/countries';
import { IS_LOCAL_SUPABASE } from '@/lib/image-optimization';

/**
 * Unified user-avatar component.
 *
 * Layout variants:
 * - `block` (default): the topics-style two-line layout — avatar on the left,
 *   `displayName` (+ optional `flair` / `country`) on the right; `children`
 *   render below the name (e.g. timestamp, badge).
 * - `inline`: a single-line "[avatar] [displayName]" badge used inside larger
 *   layouts (e.g. "Submitted by [avatar] [name]" rows on list pages and the
 *   `PositionAuthorAttribution` block).
 *
 * Sizes (`xs`/`sm`/`md`/`lg` → 24/32/40/64px). `xs` and `lg` extend the
 * legacy topics palette (`sm`/`md` only) to cover, respectively, the
 * inline-row use-case in practice list/detail pages and the standalone
 * mypage/profile-header avatar.
 *
 * The component is `"use client"` because the optional non-link
 * `profileHref` path uses `useRouter` for programmatic navigation. Server
 * components may render it freely — RSC happily renders client components.
 */
const sizeMap = {
  xs: { px: 24, className: 'w-6 h-6', textClassName: 'text-xs' },
  sm: { px: 32, className: 'w-8 h-8', textClassName: 'text-xs' },
  md: { px: 40, className: 'w-10 h-10', textClassName: 'text-sm' },
  lg: { px: 64, className: 'w-16 h-16', textClassName: 'text-base' },
} as const;

type UserAvatarSize = keyof typeof sizeMap;
type UserAvatarLayout = 'block' | 'inline';

type Props = {
  /**
   * Profile URL for the link wrapper. When `null`, the avatar and name are
   * rendered as plain text (no link / button).
   */
  profileHref: string | null;
  avatarUrl: string | null | undefined;
  displayName: string;
  locale: string;
  size?: UserAvatarSize;
  layout?: UserAvatarLayout;
  /**
   * When `false`, only the avatar image is rendered (no displayName, no
   * flair / country, no children). Used by the mypage dashboard card and
   * the `/u/[username]` profile header where the surrounding markup owns
   * the name rendering.
   */
  showName?: boolean;
  /**
   * When `true` (default) and `profileHref` is set, the link is a Next
   * `<Link>`; when `false`, a `<button>` performs imperative navigation.
   * Retained for API compatibility — no current caller sets this to
   * `false`.
   */
  asLink?: boolean;
  flair?: string | null;
  country?: string | null;
  /** Only rendered in `block` layout — ignored when `layout="inline"`. */
  children?: ReactNode;
};

export function UserAvatar({
  profileHref,
  avatarUrl,
  displayName,
  locale,
  size = 'sm',
  layout = 'block',
  showName = true,
  asLink = true,
  flair,
  country,
  children,
}: Props) {
  const router = useRouter();
  const { px, className, textClassName } = sizeMap[size];

  const avatarImage = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt={displayName}
      width={px}
      height={px}
      className={`${className} rounded-full object-cover flex-shrink-0`}
      unoptimized={IS_LOCAL_SUPABASE}
    />
  ) : (
    <div
      className={`${className} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}
    >
      <span className={`${textClassName} text-muted-foreground`}>
        {displayName.charAt(0).toUpperCase()}
      </span>
    </div>
  );

  // Avatar-only mode — no name, no flair / country, no children. Used by
  // surfaces that own their own name rendering (mypage, ProfileHeader).
  if (!showName) {
    if (!profileHref) {
      return avatarImage;
    }
    if (asLink) {
      return (
        <Link
          href={profileHref}
          locale={locale}
          className="hover:opacity-80 transition-opacity flex-shrink-0"
        >
          {avatarImage}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(profileHref);
        }}
        className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
      >
        {avatarImage}
      </button>
    );
  }

  const flairAndCountry = (
    <>
      {flair && <span className="ml-1 text-xs leading-none text-muted-foreground">{flair}</span>}
      {country && <span className="ml-1 text-xs leading-none">{countryCodeToFlag(country)}</span>}
    </>
  );

  if (layout === 'inline') {
    const nameClassName = `font-medium text-foreground${profileHref ? ' hover:underline' : ''}`;
    const inner = (
      <>
        {avatarImage}
        <span className={nameClassName}>{displayName}</span>
        {flairAndCountry}
      </>
    );

    if (!profileHref) {
      return <span className="inline-flex items-center gap-2">{inner}</span>;
    }
    if (asLink) {
      return (
        <Link
          href={profileHref}
          locale={locale}
          className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {inner}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(profileHref);
        }}
        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
      >
        {inner}
      </button>
    );
  }

  // Default: 'block' layout (legacy topics behaviour).
  if (!profileHref) {
    return (
      <div className="flex items-start gap-3">
        {avatarImage}
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center">
            <span className="font-medium text-foreground">{displayName}</span>
            {flairAndCountry}
          </span>
          {children}
        </div>
      </div>
    );
  }

  if (asLink) {
    return (
      <div className="flex items-start gap-3">
        <Link
          href={profileHref}
          locale={locale}
          className="hover:opacity-80 transition-opacity flex-shrink-0"
        >
          {avatarImage}
        </Link>
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center">
            <Link
              href={profileHref}
              locale={locale}
              className="font-medium text-foreground hover:underline"
            >
              {displayName}
            </Link>
            {flairAndCountry}
          </span>
          {children}
        </div>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(profileHref);
  };

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={handleClick}
        className="hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
      >
        {avatarImage}
      </button>
      <div className="flex-1 min-w-0">
        <span className="inline-flex items-center">
          <button
            type="button"
            onClick={handleClick}
            className="font-medium text-foreground hover:underline cursor-pointer"
          >
            {displayName}
          </button>
          {flairAndCountry}
        </span>
        {children}
      </div>
    </div>
  );
}
