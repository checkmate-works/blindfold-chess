import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameDelete } from './use-game-delete';

// --- Mocks ---

const mockShowToast = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/config', () => ({
  notifyGameListUpdated: vi.fn(),
}));

vi.mock('@/lib/repositories', () => ({
  LocalStorageGameRepository: vi.fn(function () {
    return {
      delete: mockDelete,
    };
  }),
}));

// --- Tests ---

describe('useGameDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have deleteConfirmGameId as null', () => {
      const { result } = renderHook(() => useGameDelete());
      expect(result.current.deleteConfirmGameId).toBeNull();
    });

    it('should have confirmationModalProps.isOpen as false', () => {
      const { result } = renderHook(() => useGameDelete());
      expect(result.current.confirmationModalProps.isOpen).toBe(false);
    });

    it('should return translated strings in confirmationModalProps', () => {
      const { result } = renderHook(() => useGameDelete());
      const props = result.current.confirmationModalProps;
      expect(props.title).toBe('deleteGameTitle');
      expect(props.message).toBe('deleteGameMessage');
      expect(props.confirmText).toBe('deleteConfirm');
      expect(props.cancelText).toBe('cancel');
    });

    it('should have confirmVariant as danger', () => {
      const { result } = renderHook(() => useGameDelete());
      expect(result.current.confirmationModalProps.confirmVariant).toBe('danger');
    });
  });

  describe('handleDeleteGame', () => {
    it('should set deleteConfirmGameId when called', () => {
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-123');
      });

      expect(result.current.deleteConfirmGameId).toBe('game-123');
      expect(result.current.confirmationModalProps.isOpen).toBe(true);
    });

    it('should update deleteConfirmGameId when called with a different id', () => {
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-1');
      });
      expect(result.current.deleteConfirmGameId).toBe('game-1');

      act(() => {
        result.current.handleDeleteGame('game-2');
      });
      expect(result.current.deleteConfirmGameId).toBe('game-2');
    });
  });

  describe('cancelDelete', () => {
    it('should reset deleteConfirmGameId to null', () => {
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-123');
      });
      expect(result.current.deleteConfirmGameId).toBe('game-123');

      act(() => {
        result.current.cancelDelete();
      });
      expect(result.current.deleteConfirmGameId).toBeNull();
      expect(result.current.confirmationModalProps.isOpen).toBe(false);
    });
  });

  describe('confirmDeleteGame', () => {
    it('should do nothing when deleteConfirmGameId is null', async () => {
      const { result } = renderHook(() => useGameDelete());

      await act(async () => {
        await result.current.confirmDeleteGame();
      });

      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should delete the game and show success toast', async () => {
      mockDelete.mockResolvedValue(undefined);
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-123');
      });

      await act(async () => {
        await result.current.confirmDeleteGame();
      });

      expect(mockDelete).toHaveBeenCalledWith('game-123');
      expect(mockShowToast).toHaveBeenCalledWith('gameDeletedToast', 'success');
      expect(result.current.deleteConfirmGameId).toBeNull();
    });

    it('should show error toast when delete fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDelete.mockRejectedValue(new Error('Delete failed'));
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-123');
      });

      await act(async () => {
        await result.current.confirmDeleteGame();
      });

      expect(mockShowToast).toHaveBeenCalledWith('deleteFailedToast', 'error');
      expect(result.current.deleteConfirmGameId).toBeNull();
      consoleErrorSpy.mockRestore();
    });

    it('should reset deleteConfirmGameId even on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDelete.mockRejectedValue(new Error('Delete failed'));
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-123');
      });

      await act(async () => {
        await result.current.confirmDeleteGame();
      });

      expect(result.current.deleteConfirmGameId).toBeNull();
      expect(result.current.confirmationModalProps.isOpen).toBe(false);
    });
  });

  describe('confirmationModalProps callbacks', () => {
    it('onConfirm should trigger confirmDeleteGame', async () => {
      mockDelete.mockResolvedValue(undefined);
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-456');
      });

      await act(async () => {
        await result.current.confirmationModalProps.onConfirm();
      });

      expect(mockDelete).toHaveBeenCalledWith('game-456');
    });

    it('onCancel should trigger cancelDelete', () => {
      const { result } = renderHook(() => useGameDelete());

      act(() => {
        result.current.handleDeleteGame('game-456');
      });
      expect(result.current.confirmationModalProps.isOpen).toBe(true);

      act(() => {
        result.current.confirmationModalProps.onCancel();
      });
      expect(result.current.confirmationModalProps.isOpen).toBe(false);
      expect(result.current.deleteConfirmGameId).toBeNull();
    });
  });
});
