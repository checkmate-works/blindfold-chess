import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

afterEach(() => {
  cleanup();
});

describe('Modal — default behavior (focus-trap opt-in baseline)', () => {
  it('omitting trapFocus does NOT trap Tab — outside elements remain reachable', () => {
    const onClose = vi.fn();
    const outside = document.createElement('button');
    outside.id = 'outside-btn';
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <button type="button" data-testid="inside-btn">
          inside
        </button>
      </Modal>
    );

    // Sanity: outside button is still focused — default Modal does not
    // pull focus into the dialog. Only the trapFocus opt-in callers
    // (AttachmentModal) should observe focus migration.
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('default classes preserve the centered-card layout (no fullHeightOnMobile)', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>body</div>
      </Modal>
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLDivElement;
    // Default container: centered with p-4 padding.
    const container = dialog.parentElement!;
    expect(container.className).toContain('items-center');
    expect(container.className).toContain('justify-center');
    expect(container.className).toContain('p-4');

    // Default dialog: rounded-lg + max-h-[90vh] + overflow-y-auto.
    expect(dialog.className).toContain('rounded-lg');
    expect(dialog.className).toContain('max-h-[90vh]');
    expect(dialog.className).toContain('overflow-y-auto');

    // The fullHeight-only class set must NOT be present.
    expect(dialog.className).not.toContain('h-full');
    expect(dialog.className).not.toContain('max-h-screen');
  });

  it('respects custom maxWidth in the default layout', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} maxWidth="max-w-md">
        <div>body</div>
      </Modal>
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLDivElement;
    expect(dialog.className).toContain('max-w-md');
  });

  it('always sets data-app-modal=true (keyboard-guards contract preserved)', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>body</div>
      </Modal>
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLDivElement;
    expect(dialog.getAttribute('data-app-modal')).toBe('true');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('renders nothing when isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>body</div>
      </Modal>
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Escape key closes the modal regardless of trapFocus', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>body</div>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop area calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>body</div>
      </Modal>
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLDivElement;
    fireEvent.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the dialog does NOT close it', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div data-testid="inner">body</div>
      </Modal>
    );
    const inner = document.querySelector('[data-testid="inner"]') as HTMLDivElement;
    fireEvent.click(inner);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Modal — opt-in fullHeightOnMobile', () => {
  it('uses the mobile-fullscreen class set when fullHeightOnMobile=true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} fullHeightOnMobile>
        <div>body</div>
      </Modal>
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLDivElement;
    expect(dialog.className).toContain('h-full');
    expect(dialog.className).toContain('max-h-screen');
    // The sm:* breakpoint variants remain so desktop falls back to the
    // centered card layout.
    expect(dialog.className).toContain('sm:rounded-lg');
    expect(dialog.className).toContain('sm:max-w-2xl');

    const container = dialog.parentElement!;
    // The fullHeight container drops items-center / justify-center on
    // mobile and only re-introduces them at sm:.
    expect(container.className).toContain('sm:items-center');
    expect(container.className).toContain('sm:justify-center');
    expect(container.className).not.toMatch(/(^|\s)items-center(\s|$)/);
  });
});

describe('Modal — opt-in keepMounted (Phase 8 Fix 5)', () => {
  it('default behavior: omitting keepMounted unmounts on close (regression baseline)', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div data-testid="inside">body</div>
      </Modal>
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    rerender(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div data-testid="inside">body</div>
      </Modal>
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[data-testid="inside"]')).toBeNull();
  });

  it('keepMounted=true: children stay in the DOM when closed and the wrapper is hidden', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} keepMounted>
        <div data-testid="inside">body</div>
      </Modal>
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    rerender(
      <Modal isOpen={false} onClose={vi.fn()} keepMounted>
        <div data-testid="inside">body</div>
      </Modal>
    );
    // Children + dialog still mounted.
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(document.querySelector('[data-testid="inside"]')).not.toBeNull();
    // Wrapper is hidden via Tailwind `hidden` and aria-hidden=true.
    const wrapper = dialog!.parentElement!.parentElement!;
    expect(wrapper.className).toContain('hidden');
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
  });

  it('keepMounted=true: re-opening preserves the children identity (state persistence)', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} keepMounted>
        <input data-testid="state-input" defaultValue="" />
      </Modal>
    );
    const input = document.querySelector('[data-testid="state-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'persistent' } });
    expect(input.value).toBe('persistent');

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} keepMounted>
        <input data-testid="state-input" defaultValue="" />
      </Modal>
    );
    // Same DOM node; uncontrolled input value is retained.
    const inputClosed = document.querySelector('[data-testid="state-input"]') as HTMLInputElement;
    expect(inputClosed).toBe(input);
    expect(inputClosed.value).toBe('persistent');

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} keepMounted>
        <input data-testid="state-input" defaultValue="" />
      </Modal>
    );
    const inputReopened = document.querySelector('[data-testid="state-input"]') as HTMLInputElement;
    expect(inputReopened.value).toBe('persistent');
  });
});

describe('Modal — opt-in trapFocus', () => {
  it('moves focus inside the dialog when trapFocus=true', () => {
    const trigger = document.createElement('button');
    trigger.id = 'opener';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    render(
      <Modal isOpen={true} onClose={vi.fn()} trapFocus>
        <button type="button" data-testid="first-inner">
          inside
        </button>
      </Modal>
    );
    const inner = document.querySelector('[data-testid="first-inner"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(inner);

    trigger.remove();
  });
});
