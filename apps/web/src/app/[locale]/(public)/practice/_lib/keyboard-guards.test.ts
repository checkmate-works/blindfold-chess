import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isEditableElement, isModalOpen, shouldIgnoreKeyEvent } from './keyboard-guards';

function makeInput(type: string): HTMLInputElement {
  const el = document.createElement('input');
  el.type = type;
  return el;
}

function makeKeyEvent(init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'a', ...init });
}

describe('keyboard-guards', () => {
  afterEach(() => {
    // Clean up any stray nodes (modals, inputs, etc.) appended during a test.
    document.body.innerHTML = '';
  });

  describe('isEditableElement', () => {
    const EDITABLE_INPUT_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password', 'number'];

    for (const type of EDITABLE_INPUT_TYPES) {
      it(`returns true for <input type="${type}">`, () => {
        expect(isEditableElement(makeInput(type))).toBe(true);
      });
    }

    it('returns true for <textarea>', () => {
      expect(isEditableElement(document.createElement('textarea'))).toBe(true);
    });

    it('returns true for <select>', () => {
      expect(isEditableElement(document.createElement('select'))).toBe(true);
    });

    it('returns true for a contenteditable element', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      // jsdom does not compute `isContentEditable` from the attribute — stub it
      // the same way as use-algebraic-keyboard-input.test.ts does.
      Object.defineProperty(div, 'isContentEditable', {
        configurable: true,
        value: true,
      });
      expect(isEditableElement(div)).toBe(true);
    });

    it('returns false for <button>', () => {
      expect(isEditableElement(document.createElement('button'))).toBe(false);
    });

    it('returns false for a plain <div>', () => {
      expect(isEditableElement(document.createElement('div'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isEditableElement(null)).toBe(false);
    });
  });

  describe('isModalOpen', () => {
    it('returns false when no element has aria-modal="true"', () => {
      expect(isModalOpen()).toBe(false);
    });

    it('returns true when an element with aria-modal="true" is in the DOM', () => {
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
      expect(isModalOpen()).toBe(true);
    });

    it('returns true when multiple aria-modal elements are in the DOM', () => {
      for (let i = 0; i < 3; i++) {
        const m = document.createElement('div');
        m.setAttribute('aria-modal', 'true');
        document.body.appendChild(m);
      }
      expect(isModalOpen()).toBe(true);
    });

    it('returns false when an element only has aria-modal="false"', () => {
      // The selector is intentionally `[aria-modal="true"]`, so a dialog that
      // exists in the DOM but is NOT currently modal (aria-modal="false")
      // should not block practice keyboard handlers.
      const nonModal = document.createElement('div');
      nonModal.setAttribute('role', 'dialog');
      nonModal.setAttribute('aria-modal', 'false');
      document.body.appendChild(nonModal);
      expect(isModalOpen()).toBe(false);
    });
  });

  describe('shouldIgnoreKeyEvent', () => {
    it('returns false for a plain unmodified key event with no modal and no editable target', () => {
      expect(shouldIgnoreKeyEvent(makeKeyEvent())).toBe(false);
    });

    it.each([
      ['ctrlKey', { ctrlKey: true }],
      ['metaKey', { metaKey: true }],
      ['altKey', { altKey: true }],
      ['shiftKey', { shiftKey: true }],
    ])('returns true when %s modifier is held', (_name, init) => {
      expect(shouldIgnoreKeyEvent(makeKeyEvent(init))).toBe(true);
    });

    it('returns true for auto-repeat events', () => {
      expect(shouldIgnoreKeyEvent(makeKeyEvent({ repeat: true }))).toBe(true);
    });

    it('returns true when focus is inside an editable element', () => {
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);
      const event = new KeyboardEvent('keydown', { key: 'a' });
      Object.defineProperty(event, 'target', { configurable: true, value: input });
      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });

    it('returns true when a modal is open', () => {
      const modal = document.createElement('div');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
      expect(shouldIgnoreKeyEvent(makeKeyEvent())).toBe(true);
    });
  });

  describe('DOM cleanup between tests', () => {
    let leakedModal: HTMLElement;

    beforeEach(() => {
      leakedModal = document.createElement('div');
      leakedModal.setAttribute('aria-modal', 'true');
      document.body.appendChild(leakedModal);
    });

    it('sees the modal within the test', () => {
      expect(isModalOpen()).toBe(true);
    });

    it('no longer sees the modal in the next test thanks to afterEach cleanup', () => {
      // The afterEach hook on the parent describe wipes document.body,
      // so the modal added by beforeEach above is re-added but the previous
      // one is gone. If cleanup were broken, isModalOpen would still be true
      // without the new beforeEach run, but either way only one modal exists.
      expect(document.querySelectorAll('[aria-modal="true"]').length).toBe(1);
    });
  });
});
