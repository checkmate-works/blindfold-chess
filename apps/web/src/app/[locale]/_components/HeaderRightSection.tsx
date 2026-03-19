'use client';

import { useAuth } from '../_contexts/AuthContext';
import { AuthStatusDisplay } from './AuthStatusDisplay';
import { NotificationBadge } from './NotificationBadge';
import { Skeleton } from './Skeleton';

type Props = {
  isAuthenticated: boolean;
  avatarUrl: string | null;
  displayName: string | null;
};

export function HeaderRightSection({ isAuthenticated, avatarUrl, displayName }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading && isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {user && <NotificationBadge />}
      <AuthStatusDisplay avatarUrl={avatarUrl} displayName={displayName} />
    </div>
  );
}
