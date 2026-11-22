'use client';

import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import type { Locale } from '@/app/[locale]/_lib/types';

import { LargeDownloadConsentDialog } from './LargeDownloadConsentDialog';
import { MaiaLockedInfoModal } from './MaiaLockedInfoModal';

const MAIA_MODEL_SIZE_LABEL = '46 MB';

type ConfirmDialog = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

type InfoModal = {
  isOpen: boolean;
  onClose: () => void;
};

type Props = {
  /** The dialog controllers from `useMaiaGameLaunch`. */
  launch: {
    consentDialog: ConfirmDialog;
    lockedInfoModal: InfoModal;
  };
  /** Server-resolved Maia access (the viewer's level) for the modal copy. */
  maiaAccess: MaiaEngineAccess;
  locale: Locale;
};

/**
 * The two Maia-related dialogs shared by every engine-backed new-game form
 * (standard / pgn / position): the large-download consent dialog and the
 * modal a locked Maia card opens. Each form renders this once, wired to its
 * `useMaiaGameLaunch` controller.
 */
export function GameLaunchModals({ launch, maiaAccess, locale }: Props) {
  return (
    <>
      <LargeDownloadConsentDialog
        isOpen={launch.consentDialog.isOpen}
        onConfirm={launch.consentDialog.onConfirm}
        onCancel={launch.consentDialog.onCancel}
        sizeLabel={MAIA_MODEL_SIZE_LABEL}
      />
      <MaiaLockedInfoModal
        isOpen={launch.lockedInfoModal.isOpen}
        onClose={launch.lockedInfoModal.onClose}
        level={maiaAccess.level}
        locale={locale}
      />
    </>
  );
}
