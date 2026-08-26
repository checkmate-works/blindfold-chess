import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MaskedEmail } from './MaskedEmail';

afterEach(cleanup);

const labels = {
  revealEmail: 'Show email address',
  hideEmail: 'Hide email address',
};

describe('MaskedEmail', () => {
  it('renders the address masked until the toggle is pressed', () => {
    render(<MaskedEmail email="k_okishima@fuji.enterprises" labels={labels} />);

    expect(screen.getByText('k***@fuji.enterprises')).toBeTruthy();
    expect(screen.queryByText('k_okishima@fuji.enterprises')).toBeNull();
  });

  it('reveals and re-hides the address on successive toggles', () => {
    render(<MaskedEmail email="k_okishima@fuji.enterprises" labels={labels} />);

    fireEvent.click(screen.getByRole('button', { name: labels.revealEmail }));
    expect(screen.getByText('k_okishima@fuji.enterprises')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: labels.hideEmail }));
    expect(screen.getByText('k***@fuji.enterprises')).toBeTruthy();
  });

  it('renders the fallback with no toggle when there is no address', () => {
    render(<MaskedEmail email={null} labels={labels} fallback="—" />);

    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
