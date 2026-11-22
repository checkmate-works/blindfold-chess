// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EngineSelector } from './EngineSelector';

expect.extend(matchers);

vi.mock('@/i18n/use-safe-translations');

vi.mock('next/image', () => ({
  default: () => null,
}));

const NOTE_KEY = 'engineMaiaUnlockedNote';

function renderSelector(
  maiaCardMode: 'unlocked' | 'locked',
  value: 'stockfish' | 'maia' = 'stockfish'
) {
  const onChange = vi.fn();
  const onMaiaLockedClick = vi.fn();
  render(
    <EngineSelector
      value={value}
      onChange={onChange}
      maiaCardMode={maiaCardMode}
      onMaiaLockedClick={onMaiaLockedClick}
    />
  );
  return { onChange, onMaiaLockedClick };
}

describe('EngineSelector Maia card', () => {
  afterEach(cleanup);

  it('says what unlocked Maia, before anything is selected', () => {
    renderSelector('unlocked');
    expect(screen.getByText(NOTE_KEY)).toBeInTheDocument();
  });

  it('keeps the note regardless of which engine is selected', () => {
    renderSelector('unlocked', 'maia');
    expect(screen.getByText(NOTE_KEY)).toBeInTheDocument();
  });

  it('does not render the note for a locked card', () => {
    renderSelector('locked');
    expect(screen.queryByText(NOTE_KEY)).not.toBeInTheDocument();
  });

  it('lets an unlocked Maia card be selected', () => {
    const { onChange } = renderSelector('unlocked');
    fireEvent.click(screen.getByRole('button', { name: /engineMaiaLabel/ }));
    expect(onChange).toHaveBeenCalledWith('maia');
  });

  it('explains a locked Maia card instead of selecting it', () => {
    const { onChange, onMaiaLockedClick } = renderSelector('locked');
    fireEvent.click(screen.getByRole('button', { name: /engineMaiaLabel/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onMaiaLockedClick).toHaveBeenCalledTimes(1);
  });
});
