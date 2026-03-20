import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import type { QuitConfirmModalLabels } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';

/**
 * Returns QuitConfirmModal labels from `practice.quitConfirmModal` translations.
 * For components that use different translation keys, pass `overrides` to replace specific labels.
 */
export function useQuitConfirmLabels(
  overrides?: Partial<QuitConfirmModalLabels>
): QuitConfirmModalLabels {
  const t = useTranslations('practice.quitConfirmModal');

  return useMemo(
    () => ({
      title: overrides?.title ?? t('title'),
      message: overrides?.message ?? t('message'),
      confirmButton: overrides?.confirmButton ?? t('confirmButton'),
      cancelButton: overrides?.cancelButton ?? t('cancelButton'),
    }),
    [t, overrides?.title, overrides?.message, overrides?.confirmButton, overrides?.cancelButton]
  );
}
