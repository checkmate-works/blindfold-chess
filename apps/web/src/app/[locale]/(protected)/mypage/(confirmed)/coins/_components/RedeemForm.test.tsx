import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getBeltColorHex } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';

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
    expect(screen.queryByText('redeem.notice.dan_rank.title')).not.toBeInTheDocument();
  });

  it('keeps the card and explains itself with an empty balance', () => {
    // The user with no coins is the one who most needs to see what coins buy,
    // and the section has to hold its shape for the loading skeleton.
    const { container } = render(<RedeemForm {...baseProps} balance={0} />);

    expect(screen.getByText('redeem.notice.no_balance.body')).toBeInTheDocument();
    expect(container.querySelector('#redeem-amount')?.closest('[inert]')).not.toBeNull();
  });

  it('lets an entitlement outrank an empty balance', () => {
    render(<RedeemForm {...baseProps} balance={0} block="dan_rank" />);

    expect(screen.getByText('redeem.notice.dan_rank.body')).toBeInTheDocument();
    expect(screen.queryByText('redeem.notice.no_balance.body')).not.toBeInTheDocument();
  });

  it.each(['dan_rank', 'subscription'] as const)(
    'covers the controls with the %s notice instead of dropping them',
    (reason) => {
      const { container } = render(<RedeemForm {...baseProps} block={reason} />);

      expect(screen.getByText(`redeem.notice.${reason}.body`)).toBeInTheDocument();
      // The card stays mounted so the section keeps its shape — but every
      // control under the notice must be unreachable, not merely covered.
      const input = container.querySelector('#redeem-amount');
      expect(input).toBeInTheDocument();
      expect(input?.closest('[inert]')).not.toBeNull();
    }
  );

  it('fills the dan badge with the belt colour rather than tinting the icon', () => {
    // The belt path is line art — a black *icon* is a hollow outline that
    // reads as no belt at all. The colour has to be the badge's fill.
    const { container } = render(<RedeemForm {...baseProps} block="dan_rank" />);

    const badge = container.querySelector('[style*="background-color"]');
    expect(badge).toHaveStyle({ backgroundColor: getBeltColorHex('1dan') });
  });
});
