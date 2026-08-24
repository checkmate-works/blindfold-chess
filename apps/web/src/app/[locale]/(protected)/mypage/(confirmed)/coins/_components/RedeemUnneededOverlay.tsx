import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import type { IconType } from 'react-icons';
import { GiBlackBelt } from 'react-icons/gi';
import { HiShieldCheck } from 'react-icons/hi2';

import type { AdFreeRedemptionBlock } from '@/lib/ads/ad-free-redemption';

/**
 * The face each reason wears. Deliberately reason-specific rather than one
 * shared "already covered" mark: the icon is the fastest read on the card and
 * it should say WHICH of the user's standings is doing the covering — the
 * belt is the app's dan icon everywhere else, and the shield reads as
 * "your plan has this handled".
 */
const REASON_ICONS: Record<AdFreeRedemptionBlock, IconType> = {
  dan_rank: GiBlackBelt,
  subscription: HiShieldCheck,
};

type Props = {
  reason: AdFreeRedemptionBlock;
  /** The redeem card, rendered dimmed and inert underneath the notice. */
  children: ReactNode;
};

/**
 * Covers the redeem card with "you don't need to spend coins on this", for
 * users whose ads are already suppressed by dan rank or a subscription.
 *
 * @design Cover, don't replace
 *
 * Swapping the card out for a bare paragraph changes the section's shape
 * per-user, which leaves a loading skeleton nothing stable to imitate — it
 * would have to guess which of two layouts the server is about to send.
 * Keeping the card mounted and laying the notice over it means the section
 * occupies the same box for everyone, and the reader still sees what the
 * exchange would have offered instead of a sentence about an absence.
 *
 * The covered card is `inert` + `aria-hidden`, so the amount input and the
 * submit button are unreachable by pointer, keyboard and assistive tech —
 * a visual cover alone would leave a tab-reachable form whose submit is
 * guaranteed to fail in `redeemAdFree`. Stacking is a single-cell grid
 * rather than `position: absolute` so the cell grows to whichever of the
 * two layers is taller and the notice can never be clipped on narrow
 * screens.
 */
export function RedeemUnneededOverlay({ reason, children }: Props) {
  const t = useTranslations('MypagePoints');
  const Icon = REASON_ICONS[reason];

  return (
    <div className="grid">
      <div inert aria-hidden="true" className="col-start-1 row-start-1 opacity-60 select-none">
        {children}
      </div>

      <div className="col-start-1 row-start-1 z-10 flex items-center justify-center rounded-xl bg-card/50 p-6 backdrop-blur-xs">
        <div className="flex flex-col items-center gap-2 text-center">
          <Icon aria-hidden="true" className="h-8 w-8 text-primary" />
          <p className="text-sm font-semibold text-foreground">{t('redeem.notice.title')}</p>
          <p className="text-sm text-muted-foreground">{t(`redeem.notice.${reason}`)}</p>
        </div>
      </div>
    </div>
  );
}
