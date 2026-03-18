'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';

import { Link, useRouter } from '@/i18n/routing';

import { countryCodeToFlag } from '@/lib/countries';

const sizeMap = {
  sm: { px: 32, className: 'w-8 h-8', textClassName: 'text-xs' },
  md: { px: 40, className: 'w-10 h-10', textClassName: 'text-sm' },
} as const;

type Props = {
  profileHref: string | null;
  avatarUrl: string | null | undefined;
  displayName: string;
  locale: string;
  size?: keyof typeof sizeMap;
  asLink?: boolean;
  flair?: string | null;
  country?: string | null;
  children?: ReactNode;
};

export function UserAvatar({
  profileHref,
  avatarUrl,
  displayName,
  locale,
  size = 'sm',
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
      unoptimized
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

  const flairAndCountry = (
    <>
      {flair && <span className="ml-1 text-xs leading-none text-muted-foreground">{flair}</span>}
      {country && <span className="ml-1 text-xs leading-none">{countryCodeToFlag(country)}</span>}
    </>
  );

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
