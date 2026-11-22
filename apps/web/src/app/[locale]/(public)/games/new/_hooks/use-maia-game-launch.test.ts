import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockShouldWarn } = vi.hoisted(() => ({
  mockShouldWarn: vi.fn(),
}));

vi.mock('@/lib/network/connection', () => ({
  shouldWarnBeforeLargeDownload: mockShouldWarn,
}));

const { useMaiaGameLaunch } = await import('./use-maia-game-launch');

describe('useMaiaGameLaunch', () => {
  const navigateToGame = vi.fn();

  beforeEach(() => {
    mockShouldWarn.mockReset().mockReturnValue(false);
    navigateToGame.mockReset();
  });

  afterEach(cleanup);

  it('navigates straight away on an unmetered link, whatever the engine', () => {
    const { result } = renderHook(() => useMaiaGameLaunch({ navigateToGame }));

    act(() => result.current.start('stockfish'));
    act(() => result.current.start('maia'));

    expect(navigateToGame).toHaveBeenCalledTimes(2);
    expect(result.current.consentDialog.isOpen).toBe(false);
  });

  it('shows the large-download consent before a Maia game on a metered link', () => {
    mockShouldWarn.mockReturnValue(true);
    const { result } = renderHook(() => useMaiaGameLaunch({ navigateToGame }));

    act(() => result.current.start('maia'));
    expect(result.current.consentDialog.isOpen).toBe(true);
    expect(navigateToGame).not.toHaveBeenCalled();

    act(() => result.current.consentDialog.onConfirm());
    expect(navigateToGame).toHaveBeenCalledTimes(1);
  });

  it('stops loading when the consent is declined', () => {
    mockShouldWarn.mockReturnValue(true);
    const { result } = renderHook(() => useMaiaGameLaunch({ navigateToGame }));

    act(() => result.current.start('maia'));
    act(() => result.current.consentDialog.onCancel());

    expect(result.current.isLoading).toBe(false);
    expect(navigateToGame).not.toHaveBeenCalled();
  });

  it('does not ask for consent for an engine with no large download', () => {
    mockShouldWarn.mockReturnValue(true);
    const { result } = renderHook(() => useMaiaGameLaunch({ navigateToGame }));

    act(() => result.current.start('stockfish'));

    expect(result.current.consentDialog.isOpen).toBe(false);
    expect(navigateToGame).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the locked-card modal', () => {
    const { result } = renderHook(() => useMaiaGameLaunch({ navigateToGame }));

    act(() => result.current.openLockedInfo());
    expect(result.current.lockedInfoModal.isOpen).toBe(true);

    act(() => result.current.lockedInfoModal.onClose());
    expect(result.current.lockedInfoModal.isOpen).toBe(false);
  });
});
