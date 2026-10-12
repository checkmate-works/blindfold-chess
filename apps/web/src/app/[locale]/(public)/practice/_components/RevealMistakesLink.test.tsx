import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useExpandedIndexSet } from '../_hooks/use-expanded-index-set';
import { useMistakeReveal } from '../_hooks/use-mistake-reveal';
import { RevealMistakesLink } from './RevealMistakesLink';

/** A minimal problem list wired the way the real ones are. */
function ProblemList({ outcomes }: { outcomes: boolean[] }) {
  const { expanded, toggle, expand } = useExpandedIndexSet();
  const missed = outcomes.flatMap((correct, index) => (correct ? [] : [index]));
  const rowId = useMistakeReveal(missed, expand);
  return (
    <ul>
      {outcomes.map((_, index) => (
        <li key={index} id={rowId(index)} data-testid={`row-${index}`}>
          <button type="button" onClick={() => toggle(index)}>
            toggle {index}
          </button>
          {expanded.has(index) && <p>detail {index}</p>}
        </li>
      ))}
    </ul>
  );
}

describe('RevealMistakesLink', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = function (this: Element, arg) {
      scrollIntoView(this, arg);
    };
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is plain text when no problem list is on the page', () => {
    render(<RevealMistakesLink>Incorrect: 2</RevealMistakesLink>);

    expect(screen.getByText('Incorrect: 2').tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is plain text when the list has nothing missed', () => {
    render(
      <>
        <RevealMistakesLink>Incorrect: 0</RevealMistakesLink>
        <ProblemList outcomes={[true, true]} />
      </>
    );

    expect(screen.getByText('Incorrect: 0').tagName).toBe('SPAN');
  });

  it('opens every missed row and scrolls to the first one', () => {
    render(
      <>
        <RevealMistakesLink>Incorrect: 2</RevealMistakesLink>
        <ProblemList outcomes={[true, false, true, false]} />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Incorrect: 2' }));

    expect(screen.queryByText('detail 0')).toBeNull();
    expect(screen.getByText('detail 1')).toBeInTheDocument();
    expect(screen.queryByText('detail 2')).toBeNull();
    expect(screen.getByText('detail 3')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith(screen.getByTestId('row-1'), {
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('keeps rows the reader already opened, and scrolls again on a second press', () => {
    render(
      <>
        <RevealMistakesLink>Incorrect: 1</RevealMistakesLink>
        <ProblemList outcomes={[true, false]} />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'toggle 0' }));

    const link = screen.getByRole('button', { name: 'Incorrect: 1' });
    fireEvent.click(link);
    fireEvent.click(link);

    expect(screen.getByText('detail 0')).toBeInTheDocument();
    expect(screen.getByText('detail 1')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('jumps without animation when the reader prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(
      <>
        <RevealMistakesLink>Incorrect: 1</RevealMistakesLink>
        <ProblemList outcomes={[false]} />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Incorrect: 1' }));

    expect(scrollIntoView).toHaveBeenCalledWith(screen.getByTestId('row-0'), {
      behavior: 'instant',
      block: 'start',
    });
  });

  it('goes back to plain text when the list unmounts', () => {
    const { rerender } = render(
      <>
        <RevealMistakesLink>Incorrect: 1</RevealMistakesLink>
        <ProblemList outcomes={[false]} />
      </>
    );
    expect(screen.getByRole('button', { name: 'Incorrect: 1' })).toBeInTheDocument();

    act(() => {
      rerender(<RevealMistakesLink>Incorrect: 1</RevealMistakesLink>);
    });

    expect(screen.getByText('Incorrect: 1').tagName).toBe('SPAN');
  });
});
