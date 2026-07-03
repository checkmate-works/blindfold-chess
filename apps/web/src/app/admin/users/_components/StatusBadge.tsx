import { AdminBadge } from '@/app/admin/_components/AdminBadge';
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
    return <AdminBadge variant="warning">{labels.anonymous}</AdminBadge>;
  }

  if (profile.deletedAt != null) {
    return (
      <div>
        <AdminBadge variant="neutral">{labels.deleted}</AdminBadge>
        <p className="text-xs text-muted-foreground">{formatDate(profile.deletedAt)}</p>
      </div>
    );
  }

  if (profile.bannedAt != null) {
    return (
      <div>
        <AdminBadge variant="danger">{labels.banned}</AdminBadge>
        {banReason && (
          <p className="text-xs text-muted-foreground mt-1" title={banReason}>
            {banReason.length > 50 ? `${banReason.slice(0, 50)}...` : banReason}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{formatDate(profile.bannedAt)}</p>
      </div>
    );
  }

  return <AdminBadge variant="success">{labels.active}</AdminBadge>;
}
