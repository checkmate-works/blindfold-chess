import Image from 'next/image';
import Link from 'next/link';

type PlayerInfo = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  row: PlayerInfo;
  locale: string;
};

export function PlayerCell({ row, locale }: Props) {
  const name = row.displayName ?? row.username;

  return (
    <Link href={`/${locale}/@/${row.username}`} className="flex items-center gap-3 min-w-0 group">
      {row.avatarUrl ? (
        <Image
          src={row.avatarUrl}
          alt={name}
          width={36}
          height={36}
          className="rounded-full object-cover h-9 w-9 flex-shrink-0 ring-1 ring-border"
          unoptimized
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0 ring-1 ring-border">
          <span className="text-sm font-semibold">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground truncate block group-hover:text-primary transition-colors">
          {name}
        </span>
      </div>
    </Link>
  );
}
