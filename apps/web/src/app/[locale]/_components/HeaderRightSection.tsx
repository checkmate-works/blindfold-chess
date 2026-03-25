'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '../_contexts/AuthContext';
import { AuthStatusDisplay } from './AuthStatusDisplay';
import { NotificationBadge } from './NotificationBadge';

type ProfileData = {
  avatarUrl: string | null;
  displayName: string | null;
};

export function HeaderRightSection() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [profile, setProfile] = useState<ProfileData>({ avatarUrl: null, displayName: null });

  useEffect(() => {
    if (!user) {
      setProfile({ avatarUrl: null, displayName: null });
      return;
    }

    fetch('/api/header-profile')
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data: ProfileData | undefined) => {
        if (!data) return;
        setProfile(data);
      })
      .catch(() => {
        // Silently fail — profile display will use fallback
      });
  }, [user]);

  if (isLoading) {
    // Render an invisible placeholder to prevent layout shift
    return <div className="flex items-center space-x-4 h-8 w-20" />;
  }

  return (
    <div className="flex items-center space-x-4">
      {isAuthenticated && <NotificationBadge />}
      <AuthStatusDisplay
        isAuthenticated={isAuthenticated}
        avatarUrl={profile.avatarUrl}
        displayName={profile.displayName}
      />
    </div>
  );
}
