'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import { useAuth } from '../../_contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { DashboardSkeleton } from './DashboardSkeleton';

export function MypageContent() {
  const { user, isLoading } = useAuth();
  const locale = useLocale();
  const t = useTranslations('Mypage');
  const tSignIn = useTranslations('signIn');

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('signInRequired')}</p>
        <Link
          href={`/${locale}/sign-in`}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {tSignIn('title')}
        </Link>
      </div>
    );
  }

  return <Dashboard locale={locale} />;
}
