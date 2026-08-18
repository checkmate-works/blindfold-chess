import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArrowKeyAnswer } from './ArrowKeyAnswer';

function press(key: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(window, { key, ...init });
}

describe('ArrowKeyAnswer', () => {
  it('triggers the matching binding on arrow key press', () => {
    const left = vi.fn();
    const right = vi.fn();

    render(
      <ArrowKeyAnswer
        bindings={{
          ArrowLeft: { label: 'Light', onTrigger: left },
          ArrowRight: { label: 'Dark', onTrigger: right },
        }}
      >
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft');
    expect(left).toHaveBeenCalledTimes(1);
    expect(right).not.toHaveBeenCalled();

    press('ArrowRight');
    expect(right).toHaveBeenCalledTimes(1);
  });

  it('ignores arrow keys that are not bound', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowUp');
    press('ArrowDown');
    press('ArrowRight');
    expect(left).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer disabled bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft');
    expect(left).not.toHaveBeenCalled();
  });

  it('ignores presses while focus is in an input', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <input data-testid="input" />
      </ArrowKeyAnswer>
    );
    const input = screen.getByTestId('input') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowLeft' });
    expect(left).not.toHaveBeenCalled();
  });

  it('ignores presses while a modal is open', () => {
    const left = vi.fn();
    render(
      <>
        <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
          <div>children</div>
        </ArrowKeyAnswer>
        <div role="dialog" aria-modal="true" data-app-modal="true">
          modal
        </div>
      </>
    );

    press('ArrowLeft');
    expect(left).not.toHaveBeenCalled();
  });

  it('ignores presses when a modifier key is held', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft', { ctrlKey: true });
    press('ArrowLeft', { metaKey: true });
    press('ArrowLeft', { altKey: true });
    press('ArrowLeft', { shiftKey: true });
    expect(left).not.toHaveBeenCalled();
  });

  it('ignores key repeat events', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft', { repeat: true });
    expect(left).not.toHaveBeenCalled();
  });

  it('removes its window listener on unmount', () => {
    const left = vi.fn();
    const { unmount } = render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    unmount();
    press('ArrowLeft');
    expect(left).not.toHaveBeenCalled();
  });

  it('renders a hint derived from the same bindings, in canonical order', () => {
    render(
      <ArrowKeyAnswer
        bindings={{
          ArrowRight: { label: 'Dark', onTrigger: vi.fn() },
          ArrowLeft: { label: 'Light', onTrigger: vi.fn() },
        }}
      >
        <div>children</div>
      </ArrowKeyAnswer>
    );

    const hint = screen.getByTestId('keyboard-hint');
    expect(hint).toBeInTheDocument();
    // Canonical order is left, up, down, right.
    const text = hint.textContent ?? '';
    expect(text.indexOf('Light')).toBeLessThan(text.indexOf('Dark'));
    expect(text).toContain('←');
    expect(text).toContain('→');
  });

  it('omits the hint when hideHint is true', () => {
    render(
      <ArrowKeyAnswer hideHint bindings={{ ArrowLeft: { label: 'Light', onTrigger: vi.fn() } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    expect(screen.queryByTestId('keyboard-hint')).toBeNull();
  });

  it('ignores presses while focus is in a textarea or select', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <textarea data-testid="ta" />
        <select data-testid="sel">
          <option value="a">a</option>
          <option value="b">b</option>
        </select>
      </ArrowKeyAnswer>
    );

    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    ta.focus();
    fireEvent.keyDown(ta, { key: 'ArrowLeft' });
    expect(left).not.toHaveBeenCalled();

    const sel = screen.getByTestId('sel') as HTMLSelectElement;
    sel.focus();
    fireEvent.keyDown(sel, { key: 'ArrowLeft' });
    expect(left).not.toHaveBeenCalled();
  });

  it('ignores presses while focus is in a contenteditable element', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div data-testid="ce" contentEditable suppressContentEditableWarning>
          editable
        </div>
      </ArrowKeyAnswer>
    );

    const ce = screen.getByTestId('ce') as HTMLDivElement;
    // jsdom does not compute `isContentEditable` from the attribute; stub it.
    Object.defineProperty(ce, 'isContentEditable', { configurable: true, value: true });
    ce.focus();
    fireEvent.keyDown(ce, { key: 'ArrowLeft' });
    expect(left).not.toHaveBeenCalled();
  });

  it('ignores non-arrow keys entirely', () => {
    const left = vi.fn();
    render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('a');
    press('Enter');
    press(' ');
    expect(left).not.toHaveBeenCalled();
  });

  it('renders all four arrow hints in canonical ←↑↓→ order regardless of bindings declaration order', () => {
    render(
      <ArrowKeyAnswer
        bindings={{
          ArrowDown: { label: 'Down', onTrigger: vi.fn() },
          ArrowRight: { label: 'Right', onTrigger: vi.fn() },
          ArrowUp: { label: 'Up', onTrigger: vi.fn() },
          ArrowLeft: { label: 'Left', onTrigger: vi.fn() },
        }}
      >
        <div>children</div>
      </ArrowKeyAnswer>
    );

    const hint = screen.getByTestId('keyboard-hint');
    const text = hint.textContent ?? '';
    const leftIdx = text.indexOf('Left');
    const upIdx = text.indexOf('Up');
    const downIdx = text.indexOf('Down');
    const rightIdx = text.indexOf('Right');

    expect(leftIdx).toBeGreaterThanOrEqual(0);
    expect(upIdx).toBeGreaterThan(leftIdx);
    expect(downIdx).toBeGreaterThan(upIdx);
    expect(rightIdx).toBeGreaterThan(downIdx);

    // Each arrow glyph should also appear.
    expect(text).toContain('←');
    expect(text).toContain('↑');
    expect(text).toContain('↓');
    expect(text).toContain('→');
  });

  it('calls the latest handler after bindings are updated via rerender (no stale closure)', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = render(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: first } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft');
    expect(first).toHaveBeenCalledTimes(1);

    rerender(
      <ArrowKeyAnswer bindings={{ ArrowLeft: { label: 'Light', onTrigger: second } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('re-enables key handling when disabled flips from true to false', () => {
    const left = vi.fn();

    const { rerender } = render(
      <ArrowKeyAnswer disabled bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}>
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft');
    expect(left).not.toHaveBeenCalled();

    rerender(
      <ArrowKeyAnswer
        disabled={false}
        bindings={{ ArrowLeft: { label: 'Light', onTrigger: left } }}
      >
        <div>children</div>
      </ArrowKeyAnswer>
    );

    press('ArrowLeft');
    expect(left).toHaveBeenCalledTimes(1);
  });
});
