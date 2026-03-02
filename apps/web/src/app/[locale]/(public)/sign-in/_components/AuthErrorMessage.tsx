'use client';

import { useTranslations } from 'next-intl';

export function AuthErrorMessage() {
  const t = useTranslations('signIn');

  return (
    <div className="max-w-sm mx-auto mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
      <p className="text-sm text-destructive">{t('authError')}</p>
    </div>
  );
}
