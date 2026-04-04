'use client';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';

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
