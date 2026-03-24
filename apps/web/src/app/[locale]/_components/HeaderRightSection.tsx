'use client';

import { AuthStatusDisplay } from './AuthStatusDisplay';
import { NotificationBadge } from './NotificationBadge';

type Props = {
  isAuthenticated: boolean;
  avatarUrl: string | null;
  displayName: string | null;
};

export function HeaderRightSection({ isAuthenticated, avatarUrl, displayName }: Props) {
  return (
    <div className="flex items-center space-x-4">
      {isAuthenticated && <NotificationBadge />}
      <AuthStatusDisplay
        isAuthenticated={isAuthenticated}
        avatarUrl={avatarUrl}
        displayName={displayName}
      />
    </div>
  );
}
