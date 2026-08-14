'use client';

import { useAuth } from '../_contexts/AuthContext';
import { AuthStatusDisplay } from './AuthStatusDisplay';
import { NotificationBadge } from './NotificationBadge';

export function HeaderRightSection() {
  // Avatar/display name ride on the same getSessionUser() round-trip that
  // resolves `user` — this component must not fetch them separately (it once
  // paid a second waterfall request to /api/header-profile for exactly this
  // data, gated on `user` resolving first).
  const { user, isLoading, profile } = useAuth();
  const isAuthenticated = !!user;

  if (isLoading) {
    // Render an invisible placeholder to prevent layout shift
    return <div className="flex items-center space-x-4 h-8 w-20" />;
  }

  return (
    <div className="flex items-center space-x-4">
      {isAuthenticated && <NotificationBadge />}
      <AuthStatusDisplay
        isAuthenticated={isAuthenticated}
        avatarUrl={profile?.avatarUrl ?? null}
        displayName={profile?.displayName ?? null}
      />
    </div>
  );
}
