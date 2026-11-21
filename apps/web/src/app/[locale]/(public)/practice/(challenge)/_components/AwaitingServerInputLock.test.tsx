// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AwaitingServerInputLock } from './ChallengeAttemptGate';

vi.mock('@/i18n/use-safe-translations');

function renderLock(active: boolean) {
  render(
    <AwaitingServerInputLock active={active} className="mt-2">
      <p>question</p>
    </AwaitingServerInputLock>
  );
  return screen.getByText('question').parentElement!;
}

describe('AwaitingServerInputLock', () => {
  it('locks input without changing how the answered question looks', () => {
    const wrapper = renderLock(true);

    expect(wrapper.getAttribute('aria-busy')).toBe('true');
    expect(wrapper.className).toContain('pointer-events-none');
    // The answer's feedback is what marks the question as answered; dimming
    // it as well made the question blink out and back after every answer.
    expect(wrapper.className).not.toMatch(/blur|grayscale|opacity/);
  });

  it('leaves the question area untouched while not waiting', () => {
    const wrapper = renderLock(false);

    expect(wrapper.hasAttribute('aria-busy')).toBe(false);
    expect(wrapper.className).toBe('mt-2');
  });
});
