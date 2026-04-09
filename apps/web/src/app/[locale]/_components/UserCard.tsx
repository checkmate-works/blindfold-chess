import type { ReactNode } from 'react';

import Image from 'next/image';
import Link from 'next/link';

type Props = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  actions?: ReactNode;
};

export function UserCard({ username, displayName, avatarUrl, locale, actions }: Props) {
  const name = displayName ?? username;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
      <Link href={`/${locale}/u/${username}`} className="flex items-center gap-4 min-w-0 flex-1">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={48}
            height={48}
            className="rounded-full object-cover h-12 w-12 flex-shrink-0"
            unoptimized
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
            <span className="text-lg font-medium">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">@{username}</p>
        </div>
      </Link>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
