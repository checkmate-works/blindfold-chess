'use client';

import { useSafeTranslations } from '@/i18n/use-safe-translations';

import { UnsavedChangesDialog } from './UnsavedChangesDialog';

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * `UnsavedChangesDialog` pre-wired with the app-wide `unsavedChanges` labels.
 *
 * Every authoring surface under `[locale]` renders the same four strings, and
 * `UnsavedChangesDialog` makes all four optional so it can also serve `admin`,
 * which sits outside the locale segment and has no client-side next-intl
 * provider to read them from — it passes its labels down as props instead.
 * That optionality means a caller inside `[locale]` that forgets the props
 * still type-checks and silently renders the English defaults; one of the
 * fourteen call sites did exactly that and shipped an English-only dialog to
 * ja/es/pt-BR users. Reaching for this component instead of the base one makes
 * the omission impossible rather than merely unlikely.
 *
 * Reads through `useSafeTranslations` rather than next-intl directly: two of
 * the call sites it replaces (the topics post forms) already did, and that
 * wrapper only differs from the raw hook while the intl provider is absent —
 * a dev-only HMR window. Production behaviour is identical for all of them.
 */
export function LocalizedUnsavedChangesDialog({ open, onConfirm, onCancel }: Props) {
  const t = useSafeTranslations('unsavedChanges');

  return (
    <UnsavedChangesDialog
      open={open}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title={t('title')}
      message={t('message')}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
    />
  );
}
