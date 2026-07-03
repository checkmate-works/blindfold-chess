import { formatDate } from '@/app/admin/_lib/format';

type Profile = {
  bannedAt: Date | null;
  deletedAt: Date | null;
};

type StatusBadgeProps = {
  profile: Profile | undefined;
  banReason: string | null;
  labels: {
    anonymous: string;
    deleted: string;
    banned: string;
    active: string;
  };
};

export function StatusBadge({ profile, banReason, labels }: StatusBadgeProps) {
  if (!profile) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-warning-soft text-warning-soft-foreground">
        {labels.anonymous}
      </span>
    );
  }

  if (profile.deletedAt != null) {
    return (
      <div>
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
          {labels.deleted}
        </span>
        <p className="text-xs text-muted-foreground">{formatDate(profile.deletedAt)}</p>
      </div>
    );
  }

  if (profile.bannedAt != null) {
    return (
      <div>
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-destructive-soft text-destructive-soft-foreground">
          {labels.banned}
        </span>
        {banReason && (
          <p className="text-xs text-muted-foreground mt-1" title={banReason}>
            {banReason.length > 50 ? `${banReason.slice(0, 50)}...` : banReason}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{formatDate(profile.bannedAt)}</p>
      </div>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-success-soft text-success-soft-foreground">
      {labels.active}
    </span>
  );
}
