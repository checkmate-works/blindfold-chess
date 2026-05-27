'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Modal } from '@/app/[locale]/_components/Modal';

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
 */
export function LargeDownloadConsentDialog({ isOpen, onConfirm, onCancel, sizeLabel }: Props) {
  const t = useTranslations('largeDownloadConsent');

  return (
    <Modal isOpen={isOpen} title={t('title')} onClose={onCancel} maxWidth="max-w-md" trapFocus>
      <div className="space-y-4">
        <p className="text-foreground">{t('body', { size: sizeLabel })}</p>
        <p className="text-sm text-muted-foreground">{t('cachedNote')}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {t('continue')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
