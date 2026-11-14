import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SignupMethodIcon } from './SignupMethodIcon';

afterEach(cleanup);

describe('SignupMethodIcon', () => {
  it.each([
    ['google', 'Google'],
    ['email', 'Email'],
  ] as const)('renders %s as an icon named by its label', (method, label) => {
    render(<SignupMethodIcon method={method} label={label} />);

    const icon = screen.getByRole('img', { name: label });
    expect(icon).toHaveAttribute('title', label);
    expect(icon.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the text label for an unknown method', () => {
    render(<SignupMethodIcon method="unknown" label="Unknown" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
