import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KeyboardHintText } from './KeyboardHint';

afterEach(() => {
  cleanup();
});

describe('KeyboardHintText', () => {
  it('renders the given text', () => {
    render(<KeyboardHintText text="Type a letter (a-h) then a number (1-8)." />);
    const hint = screen.getByTestId('keyboard-hint-text');
    expect(hint).toHaveTextContent('Type a letter (a-h) then a number (1-8).');
  });

  it('applies desktop-only visibility classes matching KeyboardHint', () => {
    render(<KeyboardHintText text="hello" />);
    const hint = screen.getByTestId('keyboard-hint-text');
    expect(hint.className).toContain('hidden');
    expect(hint.className).toContain('[@media(pointer:fine)]:flex');
  });

  it('dims when disabled', () => {
    render(<KeyboardHintText text="hello" disabled />);
    const hint = screen.getByTestId('keyboard-hint-text');
    expect(hint.className).toContain('opacity-40');
  });

  it('renders nothing when text is empty', () => {
    render(<KeyboardHintText text="" />);
    expect(screen.queryByTestId('keyboard-hint-text')).toBeNull();
  });
});
