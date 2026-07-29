import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameFrameSource } from '@/lib/games/gif/build-game-frames';

import { GameGifPreview } from './GameGifPreview';

const SOURCE: GameFrameSource = {
  moves: ['e4', 'e5', 'Nf3', 'Nc6'],
  startingFen: null,
  setupPlies: null,
  playerColor: 'white',
  result: 'draw',
  playSettings: null,
  playSettingsLog: null,
  operationLogs: null,
  undoneLogs: null,
};

const LABELS = {
  label: 'Animated preview',
  playLabel: 'Play',
  pauseLabel: 'Pause',
};

/** jsdom ships no matchMedia; the component treats its absence as "animate". */
function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce, media: query })) as unknown as typeof matchMedia
  );
}

function frameIndex(): number {
  return Number(screen.getByTestId('gif-preview-board').getAttribute('data-frame-index'));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

describe('GameGifPreview', () => {
  it('advances on each frame’s own delay and loops back to the start', () => {
    mockReducedMotion(false);
    render(<GameGifPreview source={SOURCE} variant="plain" {...LABELS} />);

    // The opening board holds for its 1000ms; the moves that follow, 800ms each.
    expect(frameIndex()).toBe(0);
    act(() => void vi.advanceTimersByTime(999));
    expect(frameIndex()).toBe(0);
    act(() => void vi.advanceTimersByTime(1));
    expect(frameIndex()).toBe(1);
    act(() => void vi.advanceTimersByTime(800));
    expect(frameIndex()).toBe(2);

    // 5 frames for 4 moves; the last one holds 4000ms, then the loop restarts.
    // Advanced one frame at a time — the next timeout is only scheduled by the
    // effect that runs after each re-render.
    act(() => void vi.advanceTimersByTime(800));
    act(() => void vi.advanceTimersByTime(800));
    expect(frameIndex()).toBe(4);
    act(() => void vi.advanceTimersByTime(4000));
    expect(frameIndex()).toBe(0);
  });

  it('renders the board as SVG markup', () => {
    mockReducedMotion(false);
    render(<GameGifPreview source={SOURCE} variant="plain" {...LABELS} />);

    expect(screen.getByTestId('gif-preview-board').querySelector('svg')).not.toBeNull();
  });

  it('pauses and resumes from the control', () => {
    mockReducedMotion(false);
    render(<GameGifPreview source={SOURCE} variant="plain" {...LABELS} />);

    // WCAG 2.2.2: the loop runs well past five seconds, so it must be stoppable.
    act(() => screen.getByRole('button', { name: 'Pause' }).click());
    act(() => void vi.advanceTimersByTime(10_000));
    expect(frameIndex()).toBe(0);

    act(() => screen.getByRole('button', { name: 'Play' }).click());
    act(() => void vi.advanceTimersByTime(1000));
    expect(frameIndex()).toBe(1);
  });

  it('starts paused for a viewer who asked for reduced motion', () => {
    mockReducedMotion(true);
    render(<GameGifPreview source={SOURCE} variant="plain" {...LABELS} />);

    act(() => void vi.advanceTimersByTime(10_000));
    expect(frameIndex()).toBe(0);
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });
});
