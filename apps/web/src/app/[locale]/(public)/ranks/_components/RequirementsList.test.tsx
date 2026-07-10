import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RequirementsList } from './RequirementsList';
import type { RequirementDivider, RequirementItem } from './RequirementsList';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

describe('RequirementsList', () => {
  it('renders plain string items without a link', () => {
    render(<RequirementsList items={['Do the thing']} />);
    const label = screen.getByText('Do the thing');
    expect(label.closest('a')).toBeNull();
  });

  it('renders RequirementItem entries as links when href is present', () => {
    const items: RequirementItem[] = [
      { label: 'Post a position-memory problem', href: '/en/practice/position-memory/new' },
    ];
    render(<RequirementsList items={items} />);
    const link = screen.getByRole('link', { name: 'Post a position-memory problem' });
    expect(link).toHaveAttribute('href', '/en/practice/position-memory/new');
  });

  it('renders an or-divider entry as a labeled separator, not a requirement card', () => {
    const divider: RequirementDivider = { kind: 'or', label: 'or' };
    const items: (RequirementItem | RequirementDivider)[] = [
      { label: 'Post a position-memory problem', href: '/en/practice/position-memory/new' },
      divider,
      { label: 'Post a puzzle', href: '/en/practice/puzzle/new' },
    ];
    render(<RequirementsList items={items} />);

    expect(screen.getAllByRole('link')).toHaveLength(2);
    const dividerLabel = screen.getByText('or');
    expect(dividerLabel.closest('a')).toBeNull();
  });
});
