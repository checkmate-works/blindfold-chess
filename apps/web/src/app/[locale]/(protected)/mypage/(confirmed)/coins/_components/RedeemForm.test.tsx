import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RedeemForm } from './RedeemForm';

expect.extend(matchers);

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('../_actions/redeemAdFree', () => ({
  redeemAdFree: vi.fn(),
}));

const baseProps = { balance: 5, daysPerPoint: 1 };

describe('RedeemForm', () => {
  it('renders the redeem controls when the redemption is worth making', () => {
    render(<RedeemForm {...baseProps} />);

    expect(screen.getByLabelText('redeem.amountLabel')).toBeEnabled();
    expect(screen.queryByText('redeem.notice.title')).not.toBeInTheDocument();
  });

  it('renders nothing with an empty balance', () => {
    const { container } = render(<RedeemForm {...baseProps} balance={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each(['dan_rank', 'subscription'] as const)(
    'covers the controls with the %s notice instead of dropping them',
    (reason) => {
      const { container } = render(<RedeemForm {...baseProps} block={reason} />);

      expect(screen.getByText(`redeem.notice.${reason}`)).toBeInTheDocument();
      // The card stays mounted so the section keeps its shape — but every
      // control under the notice must be unreachable, not merely covered.
      const input = container.querySelector('#redeem-amount');
      expect(input).toBeInTheDocument();
      expect(input?.closest('[inert]')).not.toBeNull();
    }
  );
});
