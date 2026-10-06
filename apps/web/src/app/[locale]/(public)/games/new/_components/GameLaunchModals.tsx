'use client';

import { MAIA_GAME_POINT_COST } from '@/lib/points/constants';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import type { Locale } from '@/app/[locale]/_lib/types';

import { LargeDownloadConsentDialog } from './LargeDownloadConsentDialog';
import { MaiaCoinConfirmModal } from './MaiaCoinConfirmModal';
import { MaiaPointInfoModal } from './MaiaPointInfoModal';

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
    coinConfirmDialog: ConfirmDialog;
    consentDialog: ConfirmDialog;
    pointInfoModal: InfoModal;
  };
  /** Server-resolved Maia access (level + spendable balance) for the modal copy. */
  maiaAccess: MaiaEngineAccess;
  locale: Locale;
};

/**
 * The three Maia-related dialogs shared by every engine-backed new-game form
 * (standard / pgn / position): the coin-spend confirmation, the large-download
 * consent dialog, and the point-info modal. Each form renders this once,
 * wired to its `useMaiaGameLaunch` controller.
 */
export function GameLaunchModals({ launch, maiaAccess, locale }: Props) {
  return (
    <>
      <MaiaCoinConfirmModal
        isOpen={launch.coinConfirmDialog.isOpen}
        onConfirm={launch.coinConfirmDialog.onConfirm}
        onCancel={launch.coinConfirmDialog.onCancel}
        cost={MAIA_GAME_POINT_COST}
        spendableBalance={maiaAccess.spendableBalance}
      />
      <LargeDownloadConsentDialog
        isOpen={launch.consentDialog.isOpen}
        onConfirm={launch.consentDialog.onConfirm}
        onCancel={launch.consentDialog.onCancel}
        sizeLabel={MAIA_MODEL_SIZE_LABEL}
      />
      <MaiaPointInfoModal
        isOpen={launch.pointInfoModal.isOpen}
        onClose={launch.pointInfoModal.onClose}
        cost={MAIA_GAME_POINT_COST}
        spendableBalance={maiaAccess.spendableBalance}
        level={maiaAccess.level}
        locale={locale}
      />
    </>
  );
}
