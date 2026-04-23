import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SolutionMoveList } from './SolutionMoveList';

afterEach(() => {
  cleanup();
});

describe('SolutionMoveList', () => {
  it('alternates ⚪/⚫ starting from white when firstTurn === "w"', () => {
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
    expect(within(items[0]!).getByText('⚪')).toBeInTheDocument();
    expect(within(items[1]!).getByText('⚫')).toBeInTheDocument();
    expect(within(items[2]!).getByText('⚪')).toBeInTheDocument();
  });

  it('alternates ⚫/⚪ starting from black when firstTurn === "b"', () => {
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
    expect(within(items[0]!).getByText('⚫')).toBeInTheDocument();
    expect(within(items[1]!).getByText('⚪')).toBeInTheDocument();
    expect(within(items[2]!).getByText('⚫')).toBeInTheDocument();
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
