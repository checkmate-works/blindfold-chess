import { createElement, useRef } from 'react';

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAlgebraicKeyboardInput } from './use-algebraic-keyboard-input';

afterEach(() => {
  cleanup();
});

type HostProps = {
  onFile: (file: string) => void;
  onRank: (rank: string) => void;
  onBackspace: () => void;
  enabled: boolean;
  /** Optional extra DOM to render (e.g. <input>, modal). */
  extra?: React.ReactNode;
};

function Host({ onFile, onRank, onBackspace, enabled, extra }: HostProps) {
  useAlgebraicKeyboardInput({ onFile, onRank, onBackspace, enabled });
  return createElement('div', null, extra);
}

/**
 * Host that keeps refs to the callbacks and exposes mutators on a given
 * `ref.current` object. Used to verify the hook reads fresh callbacks on
 * every render (no stale closure) without reattaching the listener.
 */
type MutableHostProps = {
  initialFile: (file: string) => void;
  initialRank: (rank: string) => void;
  initialBackspace: () => void;
};

function MutableHost(props: MutableHostProps) {
  const fileRef = useRef(props.initialFile);
  const rankRef = useRef(props.initialRank);
  const backspaceRef = useRef(props.initialBackspace);
  fileRef.current = props.initialFile;
  rankRef.current = props.initialRank;
  backspaceRef.current = props.initialBackspace;
  useAlgebraicKeyboardInput({
    onFile: (f) => fileRef.current(f),
    onRank: (r) => rankRef.current(r),
    onBackspace: () => backspaceRef.current(),
    enabled: true,
  });
  return null;
}

function press(key: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(window, { key, ...init });
}

describe('useAlgebraicKeyboardInput', () => {
  it('calls onFile for each lowercase file letter a-h', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    for (const key of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      press(key);
    }
    expect(onFile).toHaveBeenCalledTimes(8);
    expect(onFile.mock.calls.map((c) => c[0])).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('calls onRank for each digit 1-8', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      press(key);
    }
    expect(onRank).toHaveBeenCalledTimes(8);
    expect(onRank.mock.calls.map((c) => c[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(onFile).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('calls onBackspace on Backspace', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    press('Backspace');
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
  });

  it('ignores uppercase letters', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    for (const key of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
      press(key);
    }
    expect(onFile).not.toHaveBeenCalled();
  });

  it('ignores out-of-range digits and non-a-h letters', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    for (const key of ['0', '9', 'i', 'j', 'k', 'z']) {
      press(key);
    }
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('ignores presses when a modifier key is held', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    press('a', { ctrlKey: true });
    press('a', { metaKey: true });
    press('a', { altKey: true });
    press('a', { shiftKey: true });
    press('1', { ctrlKey: true });
    press('Backspace', { metaKey: true });
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('ignores key repeat events', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    press('a', { repeat: true });
    press('1', { repeat: true });
    press('Backspace', { repeat: true });
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('ignores presses while focus is in an input, textarea, or contenteditable', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();

    const input = document.createElement('input');
    document.body.appendChild(input);
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    Object.defineProperty(editable, 'isContentEditable', {
      configurable: true,
      value: true,
    });
    document.body.appendChild(editable);

    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    input.focus();
    fireEvent.keyDown(input, { key: 'a' });
    expect(onFile).not.toHaveBeenCalled();

    textarea.focus();
    fireEvent.keyDown(textarea, { key: '1' });
    expect(onRank).not.toHaveBeenCalled();

    editable.focus();
    fireEvent.keyDown(editable, { key: 'Backspace' });
    expect(onBackspace).not.toHaveBeenCalled();

    input.remove();
    textarea.remove();
    editable.remove();
  });

  it('ignores presses while an aria-modal element is in the DOM', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(
      createElement(Host, {
        onFile,
        onRank,
        onBackspace,
        enabled: true,
        extra: createElement('div', { role: 'dialog', 'aria-modal': 'true' }, 'modal'),
      })
    );

    press('a');
    press('3');
    press('Backspace');
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('does not fire any callback when enabled is false', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: false }));

    press('a');
    press('1');
    press('Backspace');
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('removes its listener on unmount', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    const { unmount } = render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    unmount();
    press('a');
    press('1');
    press('Backspace');
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('uses the latest callback refs after rerender (no stale closure)', () => {
    const first = vi.fn();
    const second = vi.fn();
    const rank = vi.fn();
    const backspace = vi.fn();

    const { rerender } = render(
      createElement(MutableHost, {
        initialFile: first,
        initialRank: rank,
        initialBackspace: backspace,
      })
    );

    press('a');
    expect(first).toHaveBeenCalledTimes(1);

    rerender(
      createElement(MutableHost, {
        initialFile: second,
        initialRank: rank,
        initialBackspace: backspace,
      })
    );

    press('b');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith('b');
  });

  it('calls preventDefault on each handled key type', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    for (const key of ['a', '1', 'Backspace']) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(spy, `preventDefault should be called for "${key}"`).toHaveBeenCalledTimes(1);
    }
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onRank).toHaveBeenCalledTimes(1);
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('does not call preventDefault on rejected keys', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    // Uppercase letter, out-of-range digit, unrelated key, and a modifier combo
    const rejectedCases: Array<[string, KeyboardEventInit]> = [
      ['A', {}],
      ['9', {}],
      ['Escape', {}],
      ['Tab', {}],
      ['a', { ctrlKey: true }],
    ];

    for (const [key, init] of rejectedCases) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      const spy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(
        spy,
        `preventDefault should NOT be called for "${key}" ${JSON.stringify(init)}`
      ).not.toHaveBeenCalled();
    }
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
    ['altKey', { altKey: true }],
    ['shiftKey', { shiftKey: true }],
  ])('ignores a lone %s modifier on a file key', (_name, init) => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();
    render(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    press('a', init);
    expect(onFile).not.toHaveBeenCalled();
    expect(onRank).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });

  it('re-attaches the listener when enabled flips from false to true', () => {
    const onFile = vi.fn();
    const onRank = vi.fn();
    const onBackspace = vi.fn();

    const { rerender } = render(
      createElement(Host, { onFile, onRank, onBackspace, enabled: false })
    );

    press('a');
    expect(onFile).not.toHaveBeenCalled();

    rerender(createElement(Host, { onFile, onRank, onBackspace, enabled: true }));

    press('a');
    expect(onFile).toHaveBeenCalledTimes(1);
  });
});
