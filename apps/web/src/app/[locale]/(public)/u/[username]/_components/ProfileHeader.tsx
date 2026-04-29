import type { ReactNode } from 'react';

import { countryCodeToFlag } from '@/lib/countries';

import { UserAvatar } from '@/app/[locale]/_components';

type Props = {
  avatarUrl: string | null;
  username: string;
  displayName: string | null;
  flair: string | null;
  country: string | null;
  /** Right-aligned action(s). Pass leaf elements; the wrapper handles flex layout — do not pre-style with width/grow utilities. */
  action: ReactNode;
};

export function ProfileHeader({ avatarUrl, username, displayName, flair, country, action }: Props) {
  const altText = displayName ?? username;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <UserAvatar src={avatarUrl} alt={altText} size={64} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight break-words">
            {displayName}
            {flair && <span className="ml-2">{flair}</span>}
            {country && <span className="ml-2">{countryCodeToFlag(country)}</span>}
          </h1>
          <p className="text-muted-foreground mt-1">@{username}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 sm:flex-row sm:items-center sm:gap-2">
        {action}
      </div>
    </div>
  );
}
