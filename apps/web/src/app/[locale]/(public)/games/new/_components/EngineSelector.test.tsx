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

const NOTE_KEY = 'engineMaiaFreeNote';

function renderSelector(
  maiaCardMode: 'free' | 'payable' | 'locked',
  value: 'stockfish' | 'maia' = 'stockfish'
) {
  const onChange = vi.fn();
  render(
    <EngineSelector
      value={value}
      onChange={onChange}
      maiaCardMode={maiaCardMode}
      maiaCost={1}
      onMaiaLockedClick={vi.fn()}
    />
  );
  return { onChange };
}

describe('EngineSelector free-perk note', () => {
  afterEach(cleanup);

  it('explains why Maia is free when the card is free, before anything is selected', () => {
    renderSelector('free');
    expect(screen.getByText(NOTE_KEY)).toBeInTheDocument();
  });

  it('keeps the note regardless of which engine is selected', () => {
    renderSelector('free', 'maia');
    expect(screen.getByText(NOTE_KEY)).toBeInTheDocument();
  });

  it('does not render the note for payable or locked cards', () => {
    renderSelector('payable');
    expect(screen.queryByText(NOTE_KEY)).not.toBeInTheDocument();
    cleanup();
    renderSelector('locked');
    expect(screen.queryByText(NOTE_KEY)).not.toBeInTheDocument();
  });

  it('lets a free Maia card be selected', () => {
    const { onChange } = renderSelector('free');
    fireEvent.click(screen.getByRole('button', { name: /engineMaiaLabel/ }));
    expect(onChange).toHaveBeenCalledWith('maia');
  });
});
