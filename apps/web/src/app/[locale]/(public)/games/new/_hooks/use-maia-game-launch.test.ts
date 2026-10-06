// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockStartMaiaGame, mockShouldWarn } = vi.hoisted(() => ({
  mockStartMaiaGame: vi.fn(),
  mockShouldWarn: vi.fn(),
}));

vi.mock('@/app/[locale]/(public)/games/new/_actions/startMaiaGame', () => ({
  startMaiaGame: mockStartMaiaGame,
}));

vi.mock('@/lib/network/connection', () => ({
  shouldWarnBeforeLargeDownload: mockShouldWarn,
}));

const { useMaiaGameLaunch } = await import('./use-maia-game-launch');

describe('useMaiaGameLaunch', () => {
  const navigateToGame = vi.fn();

  beforeEach(() => {
    mockStartMaiaGame.mockReset();
    mockShouldWarn.mockReset().mockReturnValue(false);
    navigateToGame.mockReset();
  });

  afterEach(cleanup);

  it('navigates a non-Maia engine straight away with no charge id', () => {
    const { result } = renderHook(() =>
      useMaiaGameLaunch({ navigateToGame, maiaCardMode: 'free' })
    );

    act(() => result.current.start('stockfish'));

    expect(navigateToGame).toHaveBeenCalledWith(null);
    expect(mockStartMaiaGame).not.toHaveBeenCalled();
  });

  it('opens the coin confirmation first when the card is payable, then charges on confirm', async () => {
    mockStartMaiaGame.mockResolvedValue({ success: true, billing: 'charged' });
    const { result } = renderHook(() =>
      useMaiaGameLaunch({ navigateToGame, maiaCardMode: 'payable' })
    );

    act(() => result.current.start('maia'));
    expect(result.current.coinConfirmDialog.isOpen).toBe(true);
    expect(mockStartMaiaGame).not.toHaveBeenCalled();

    await act(async () => result.current.coinConfirmDialog.onConfirm());

    expect(mockStartMaiaGame).toHaveBeenCalledWith(expect.any(String), { allowCharge: true });
    const [chargeId] = mockStartMaiaGame.mock.calls[0];
    expect(navigateToGame).toHaveBeenCalledWith(chargeId);
  });

  it('skips the coin confirmation when the card is free and navigates without a charge id', async () => {
    mockStartMaiaGame.mockResolvedValue({ success: true, billing: 'free' });
    const { result } = renderHook(() =>
      useMaiaGameLaunch({ navigateToGame, maiaCardMode: 'free' })
    );

    await act(async () => result.current.start('maia'));

    expect(result.current.coinConfirmDialog.isOpen).toBe(false);
    expect(mockStartMaiaGame).toHaveBeenCalledWith(expect.any(String), { allowCharge: false });
    expect(navigateToGame).toHaveBeenCalledWith(null);
  });

  it('asks for the coin when a stale free card is refused by the server, then charges on confirm', async () => {
    mockStartMaiaGame
      .mockResolvedValueOnce({ error: 'chargeRequired' })
      .mockResolvedValueOnce({ success: true, billing: 'charged' });
    const { result } = renderHook(() =>
      useMaiaGameLaunch({ navigateToGame, maiaCardMode: 'free' })
    );

    await act(async () => result.current.start('maia'));

    expect(result.current.coinConfirmDialog.isOpen).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(navigateToGame).not.toHaveBeenCalled();

    await act(async () => result.current.coinConfirmDialog.onConfirm());

    const [firstId, firstOpts] = mockStartMaiaGame.mock.calls[0];
    const [secondId, secondOpts] = mockStartMaiaGame.mock.calls[1];
    expect(firstOpts).toEqual({ allowCharge: false });
    expect(secondOpts).toEqual({ allowCharge: true });
    // The retry reuses the same idempotency id so nothing can double-charge.
    expect(secondId).toBe(firstId);
    expect(navigateToGame).toHaveBeenCalledWith(firstId);
  });

  it('opens the point-info modal on an insufficient balance and stops loading', async () => {
    mockStartMaiaGame.mockResolvedValue({ error: 'insufficient_balance' });
    const { result } = renderHook(() =>
      useMaiaGameLaunch({ navigateToGame, maiaCardMode: 'payable' })
    );

    act(() => result.current.start('maia'));
    await act(async () => result.current.coinConfirmDialog.onConfirm());

    expect(result.current.pointInfoModal.isOpen).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(navigateToGame).not.toHaveBeenCalled();
  });

  it('shows the large-download consent before settling on a metered link', async () => {
    mockShouldWarn.mockReturnValue(true);
    mockStartMaiaGame.mockResolvedValue({ success: true, billing: 'free' });
    const { result } = renderHook(() =>
      useMaiaGameLaunch({ navigateToGame, maiaCardMode: 'free' })
    );

    act(() => result.current.start('maia'));
    expect(result.current.consentDialog.isOpen).toBe(true);
    expect(mockStartMaiaGame).not.toHaveBeenCalled();

    await act(async () => result.current.consentDialog.onConfirm());
    expect(navigateToGame).toHaveBeenCalledWith(null);
  });
});
