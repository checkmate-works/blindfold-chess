import Image from 'next/image';
import Link from 'next/link';

import type { LeaderboardRow } from '../_lib/types';

type Props = {
  row: LeaderboardRow;
  locale: string;
};

export function PlayerCell({ row, locale }: Props) {
  const name = row.displayName ?? row.username;

  return (
    <Link href={`/${locale}/@/${row.username}`} className="flex items-center gap-3 min-w-0">
      {row.avatarUrl ? (
        <Image
          src={row.avatarUrl}
          alt={name}
          width={32}
          height={32}
          className="rounded-full object-cover h-8 w-8 flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <span className="text-sm font-medium">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground truncate block">{name}</span>
      </div>
    </Link>
  );
}
