'use client';

import { useLocale } from 'next-intl';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { Dashboard } from './Dashboard';
import { DashboardSkeleton } from './DashboardSkeleton';

export function MypageContent() {
  const { isLoading } = useAuth();
  const locale = useLocale();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <Dashboard locale={locale} />;
}
