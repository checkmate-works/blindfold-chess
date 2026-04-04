'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  namespace: 'signIn' | 'signUp';
};

export function AuthErrorMessage({ namespace }: Props) {
  const t = useTranslations(namespace);

  return (
    <div className="max-w-sm mx-auto mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
      <p className="text-sm text-destructive">{t('authError')}</p>
    </div>
  );
}
