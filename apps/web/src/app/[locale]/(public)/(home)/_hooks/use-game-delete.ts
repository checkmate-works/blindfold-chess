'use client';

import { useState } from 'react';

import { notifyGameListUpdated } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

type Return = {
  deleteConfirmGameId: string | null;
  handleDeleteGame: (gameId: string) => void;
  confirmDeleteGame: () => Promise<void>;
  cancelDelete: () => void;
  confirmationModalProps: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmVariant: 'danger';
    onConfirm: () => void;
    onCancel: () => void;
  };
};

export function useGameDelete(): Return {
  const t = useTranslations('home.gameList');
  const { showToast } = useToast();
  const [deleteConfirmGameId, setDeleteConfirmGameId] = useState<string | null>(null);

  const handleDeleteGame = (gameId: string) => {
    setDeleteConfirmGameId(gameId);
  };

  const confirmDeleteGame = async () => {
    if (!deleteConfirmGameId) return;

    const gameRepository = new LocalStorageGameRepository();

    try {
      await gameRepository.delete(deleteConfirmGameId);
      notifyGameListUpdated();
      showToast(t('gameDeletedToast'), 'success');
    } catch (error) {
      console.error('Failed to delete game:', error);
      showToast(t('deleteFailedToast'), 'error');
    } finally {
      setDeleteConfirmGameId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmGameId(null);
  };

  return {
    deleteConfirmGameId,
    handleDeleteGame,
    confirmDeleteGame,
    cancelDelete,
    confirmationModalProps: {
      isOpen: deleteConfirmGameId !== null,
      title: t('deleteGameTitle'),
      message: t('deleteGameMessage'),
      confirmText: t('deleteConfirm'),
      cancelText: t('cancel'),
      confirmVariant: 'danger',
      onConfirm: confirmDeleteGame,
      onCancel: cancelDelete,
    },
  };
}
