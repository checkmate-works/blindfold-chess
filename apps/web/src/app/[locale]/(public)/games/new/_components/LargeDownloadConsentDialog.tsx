'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Human-readable size of the asset to be downloaded. Surfaced in the
   * dialog body so the user can size up the data cost on a metered link.
   * Example: "46 MB".
   */
  sizeLabel: string;
};

/**
 * Confirmation dialog shown before kicking off a large one-time asset
 * download (currently: Maia 3 ONNX model, ~46 MB). Patterned after the
 * App Store / Play Store "this update will use Wi-Fi data" prompt.
 *
 * Decoupled from the *decision* to show it — callers consult
 * `shouldWarnBeforeLargeDownload` (see `@/lib/network/connection`) on the
 * user's connection state and only mount this when the answer is yes.
 * That keeps Wi-Fi users free of friction and the prompt focused on the
 * audience that actually benefits from it.
 *
 * Built on `ConfirmationModal` so its action row is the one every confirm
 * dialog shares — same order, same stacking on a phone, same 12px gap and
 * 44px targets. It used to hand-roll the same row with an 8px gap.
 */
export function LargeDownloadConsentDialog({ isOpen, onConfirm, onCancel, sizeLabel }: Props) {
  const t = useTranslations('largeDownloadConsent');

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={t('title')}
      message={t('body', { size: sizeLabel })}
      confirmText={t('continue')}
      cancelText={t('cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
      trapFocus
    >
      <p className="mt-4 text-sm text-muted-foreground">{t('cachedNote')}</p>
    </ConfirmationModal>
  );
}
