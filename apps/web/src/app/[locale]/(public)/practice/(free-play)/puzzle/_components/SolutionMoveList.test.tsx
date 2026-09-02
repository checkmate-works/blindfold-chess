import type { PieceColor } from '@blindfold-chess/types';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SolutionMoveList } from './SolutionMoveList';

// `CircleMarker` renders an aria-hidden `<span>` with no text content, so we
// have to query it structurally. The two color variants are distinguishable
// by their Tailwind fill classes: white pieces get `bg-card` (inherits the
// surrounding panel, so the outlined circle reads as light), black pieces
// get `bg-foreground` (fully filled). Both share the `rounded-full` class.
function getCircleMarker(li: HTMLElement): HTMLElement {
  const marker = li.querySelector('span.rounded-full');
  if (!marker) throw new Error('expected a CircleMarker inside the listitem');
  return marker as HTMLElement;
}

function expectMarkerColor(li: HTMLElement, color: PieceColor): void {
  const marker = getCircleMarker(li);
  if (color === 'w') {
    expect(marker.className).toContain('bg-card');
    expect(marker.className).not.toContain('bg-foreground ');
  } else {
    expect(marker.className).toContain('bg-foreground');
    expect(marker.className).not.toContain('bg-card');
  }
}

describe('SolutionMoveList', () => {
  it('alternates white/black CircleMarker colors starting from white when firstTurn === "w"', () => {
    render(
      <SolutionMoveList
        moves={['h5', 'Nh2', 'Bg3']}
        firstTurn="w"
        onRemoveLast={() => {}}
        removeAriaLabel="remove"
      />
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expectMarkerColor(items[0]!, 'w');
    expectMarkerColor(items[1]!, 'b');
    expectMarkerColor(items[2]!, 'w');
  });

  it('alternates black/white CircleMarker colors starting from black when firstTurn === "b"', () => {
    render(
      <SolutionMoveList
        moves={['Qxh1', 'Kxh1', 'Rd1+']}
        firstTurn="b"
        onRemoveLast={() => {}}
        removeAriaLabel="remove"
      />
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expectMarkerColor(items[0]!, 'b');
    expectMarkerColor(items[1]!, 'w');
    expectMarkerColor(items[2]!, 'b');
  });

  it('renders the remove button only on the last chip', () => {
    render(
      <SolutionMoveList
        moves={['e4', 'e5', 'Nf3']}
        firstTurn="w"
        onRemoveLast={() => {}}
        removeAriaLabel="remove last"
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: 'remove last' });
    expect(removeButtons).toHaveLength(1);
    const items = screen.getAllByRole('listitem');
    // Last item is the one containing the button.
    expect(within(items[2]!).getByRole('button', { name: 'remove last' })).toBeInTheDocument();
  });

  it('returns null when moves is empty', () => {
    const { container } = render(
      <SolutionMoveList moves={[]} firstTurn="w" onRemoveLast={() => {}} removeAriaLabel="rm" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
