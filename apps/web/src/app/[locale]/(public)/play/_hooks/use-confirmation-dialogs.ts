import { useCallback, useState } from 'react';

type DialogState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export type ConfirmationDialogs = {
  resign: DialogState & { confirm: () => void };
  undo: DialogState & { confirm: () => void };
  restart: DialogState & {
    position: number | null;
    openWithPosition: (position: number) => void;
    confirm: () => void;
  };
};

type UseConfirmationDialogsOptions = {
  onResignConfirm: () => void;
  onUndoConfirm: () => void;
  onRestartConfirm: (position: number) => void;
};

export function useConfirmationDialogs({
  onResignConfirm,
  onUndoConfirm,
  onRestartConfirm,
}: UseConfirmationDialogsOptions): ConfirmationDialogs {
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartPosition, setRestartPosition] = useState<number | null>(null);

  // Resign dialog
  const openResign = useCallback(() => setShowResignConfirm(true), []);
  const closeResign = useCallback(() => setShowResignConfirm(false), []);
  const confirmResign = useCallback(() => {
    onResignConfirm();
    setShowResignConfirm(false);
  }, [onResignConfirm]);

  // Undo dialog
  const openUndo = useCallback(() => setShowUndoConfirm(true), []);
  const closeUndo = useCallback(() => setShowUndoConfirm(false), []);
  const confirmUndo = useCallback(() => {
    onUndoConfirm();
    setShowUndoConfirm(false);
  }, [onUndoConfirm]);

  // Restart dialog
  const openRestartWithPosition = useCallback((position: number) => {
    setRestartPosition(position);
    setShowRestartConfirm(true);
  }, []);
  const closeRestart = useCallback(() => {
    setShowRestartConfirm(false);
    setRestartPosition(null);
  }, []);
  const confirmRestart = useCallback(() => {
    if (restartPosition !== null) {
      onRestartConfirm(restartPosition);
    }
    setShowRestartConfirm(false);
    setRestartPosition(null);
  }, [restartPosition, onRestartConfirm]);

  return {
    resign: {
      isOpen: showResignConfirm,
      open: openResign,
      close: closeResign,
      confirm: confirmResign,
    },
    undo: {
      isOpen: showUndoConfirm,
      open: openUndo,
      close: closeUndo,
      confirm: confirmUndo,
    },
    restart: {
      isOpen: showRestartConfirm,
      position: restartPosition,
      openWithPosition: openRestartWithPosition,
      open: () => {}, // Not used, openWithPosition should be used instead
      close: closeRestart,
      confirm: confirmRestart,
    },
  };
}
