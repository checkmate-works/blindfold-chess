import { useEffect } from 'react';

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFocusTrap } from './use-focus-trap';

afterEach(() => {
  cleanup();
});

type ProbeProps = {
  active: boolean;
  showFocusables?: boolean;
};

function Probe({ active, showFocusables = true }: ProbeProps) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return (
    <div data-testid="container" ref={ref} tabIndex={-1}>
      {showFocusables && (
        <>
          <button type="button" data-testid="b1">
            one
          </button>
          <button type="button" data-testid="b2">
            two
          </button>
          <button type="button" data-testid="b3">
            three
          </button>
        </>
      )}
    </div>
  );
}

function ProbeWithEmptyContainer({ active }: { active: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return <div data-testid="container" ref={ref} tabIndex={-1} />;
}

function ProbeWithDelayedMount({ active, mounted }: { active: boolean; mounted: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  if (!mounted) return null;
  return (
    <div data-testid="container" ref={ref} tabIndex={-1}>
      <button type="button" data-testid="b1">
        one
      </button>
    </div>
  );
}

function ProbeWithDeadPrevious({ active }: { active: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  useEffect(() => {
    // Simulate the trigger element being removed before deactivation: the
    // hook should not throw when it tries to restore focus.
    const trigger = document.getElementById('dead-trigger');
    trigger?.remove();
  }, [active]);
  return (
    <div data-testid="container" ref={ref} tabIndex={-1}>
      <button type="button" data-testid="b1">
        one
      </button>
    </div>
  );
}

describe('useFocusTrap — activation', () => {
  it('moves focus to the first focusable child when activated', () => {
    render(<Probe active={true} />);
    const first = document.querySelector('[data-testid="b1"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(first);
  });

  it('does not move focus when inactive', () => {
    const trigger = document.createElement('button');
    trigger.id = 'outside-trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    render(<Probe active={false} />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('falls back to the container itself when there are no focusable children', () => {
    render(<ProbeWithEmptyContainer active={true} />);
    const container = document.querySelector('[data-testid="container"]') as HTMLDivElement;
    expect(document.activeElement).toBe(container);
  });

  it('activates only after the container ref attaches (delayed mount)', () => {
    const { rerender } = render(<ProbeWithDelayedMount active={true} mounted={false} />);
    // Container not in DOM yet — activation is a no-op, focus must stay
    // on document.body (no crash, no errant focus moves).
    expect(document.querySelector('[data-testid="container"]')).toBeNull();

    rerender(<ProbeWithDelayedMount active={true} mounted={true} />);
    const first = document.querySelector('[data-testid="b1"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(first);
  });
});

describe('useFocusTrap — keyboard cycling', () => {
  it('Tab on the last element wraps to the first', () => {
    render(<Probe active={true} />);
    const first = document.querySelector('[data-testid="b1"]') as HTMLButtonElement;
    const last = document.querySelector('[data-testid="b3"]') as HTMLButtonElement;
    last.focus();
    expect(document.activeElement).toBe(last);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    act(() => {
      document.dispatchEvent(event);
    });
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab on the first element wraps to the last', () => {
    render(<Probe active={true} />);
    const first = document.querySelector('[data-testid="b1"]') as HTMLButtonElement;
    const last = document.querySelector('[data-testid="b3"]') as HTMLButtonElement;
    first.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    act(() => {
      document.dispatchEvent(event);
    });
    expect(document.activeElement).toBe(last);
  });

  it('Shift+Tab when focus has escaped the container snaps to the last focusable', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    render(<Probe active={true} />);
    // Force focus outside (simulating focus leakage); the trap should
    // pull it back to `lastEl` on Shift+Tab per the implementation
    // contract (`activeEl === firstEl || !node.contains(activeEl)`).
    trigger.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    act(() => {
      document.dispatchEvent(event);
    });
    const last = document.querySelector('[data-testid="b3"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(last);
    trigger.remove();
  });

  it('Tab when the container has zero focusable descendants pulls focus to the container', () => {
    render(<ProbeWithEmptyContainer active={true} />);
    const container = document.querySelector('[data-testid="container"]') as HTMLDivElement;
    // The activation effect already focuses the container itself; here
    // we verify the keydown branch (list.length === 0) does not crash
    // and keeps focus on the container.
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    act(() => {
      document.dispatchEvent(event);
    });
    expect(document.activeElement).toBe(container);
  });

  it('non-Tab keys are ignored', () => {
    render(<Probe active={true} />);
    const first = document.querySelector('[data-testid="b1"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(first);
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    act(() => {
      document.dispatchEvent(event);
    });
    expect(document.activeElement).toBe(first);
  });
});

describe('useFocusTrap — restoration on deactivation', () => {
  it('restores focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button');
    trigger.id = 'restore-trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(<Probe active={true} />);
    expect(document.activeElement?.id).not.toBe('restore-trigger');

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('does not crash when the previously focused element has been detached', () => {
    const trigger = document.createElement('button');
    trigger.id = 'dead-trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(<ProbeWithDeadPrevious active={true} />);
    // The probe removed the trigger inside its effect; unmount should
    // not throw even though previouslyFocusedRef now points at a
    // detached element.
    expect(() => unmount()).not.toThrow();
  });

  it('toggling active=false (without unmount) is a safe no-op', () => {
    const trigger = document.createElement('button');
    trigger.id = 'toggle-trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<Probe active={true} />);
    // Activation moved focus away from the trigger.
    expect(document.activeElement?.id).not.toBe('toggle-trigger');

    rerender(<Probe active={false} />);
    // Cleanup runs (the previous effect was active=true), restoring
    // focus to the trigger.
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
