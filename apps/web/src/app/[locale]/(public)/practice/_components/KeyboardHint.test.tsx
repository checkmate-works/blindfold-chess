import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AlgebraicKeyboardHint, KeyboardHintText } from './KeyboardHint';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

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

describe('AlgebraicKeyboardHint', () => {
  it('renders text from the practice.keyboard.algebraicKeyboardHint i18n key', () => {
    render(<AlgebraicKeyboardHint />);
    const hint = screen.getByTestId('keyboard-hint-text');
    // Mock echoes `${namespace}.${key}`.
    expect(hint).toHaveTextContent('practice.keyboard.algebraicKeyboardHint');
  });

  it('forwards the disabled prop to the inner hint (dims when disabled)', () => {
    render(<AlgebraicKeyboardHint disabled />);
    const hint = screen.getByTestId('keyboard-hint-text');
    expect(hint.className).toContain('opacity-40');
  });

  it('is not dimmed when disabled is false (default)', () => {
    render(<AlgebraicKeyboardHint />);
    const hint = screen.getByTestId('keyboard-hint-text');
    expect(hint.className).toContain('opacity-100');
  });
});
