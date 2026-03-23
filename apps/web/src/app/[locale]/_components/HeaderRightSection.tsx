'use client';

import { useEffect, useRef } from 'react';

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
  const { user, isLoading, refreshUser } = useAuth();
  const hasAttemptedRefresh = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !user && !hasAttemptedRefresh.current) {
      hasAttemptedRefresh.current = true;
      refreshUser().catch(() => {
        // Silently ignore — skeleton will remain until next navigation
      });
    }
  }, [isLoading, isAuthenticated, user, refreshUser]);

  // Server says authenticated but client hasn't synced yet — show skeleton
  if (isAuthenticated && !user) {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  // Initial client-side auth fetch in progress
  if (isLoading) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4">
      {user && <NotificationBadge />}
      <AuthStatusDisplay avatarUrl={avatarUrl} displayName={displayName} />
    </div>
  );
}
