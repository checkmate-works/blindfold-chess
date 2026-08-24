import type { ReactElement, ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { GiBlackBelt } from 'react-icons/gi';
import { HiShieldCheck } from 'react-icons/hi2';

import type { AdFreeRedemptionBlock } from '@/lib/ads/ad-free-redemption';

import { getBeltColorHex } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';

/**
 * Every dan rank is a black belt, and the ad-free perk is tier-wide rather
 * than tied to one rank, so the badge shows the tier's colour. Read from the
 * rank seed data instead of hard-coding the hex, so a change to what "black
 * belt" means reaches this badge too.
 */
const DAN_BELT_HEX = getBeltColorHex('1dan');

const BADGE_CLASS =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 ring-border';
const BADGE_ICON_CLASS = 'h-6 w-6';

/**
 * The face each reason wears — deliberately reason-specific rather than one
 * shared "already covered" mark, because the badge is the fastest read on the
 * card and it should say WHICH of the user's standings is doing the covering.
 *
 * The belt icon's path is thin line art: the fill covers the outline strokes
 * and not the belt's body, so colouring the icon black leaves a nearly
 * invisible hollow outline on a dark card — and an outline that reads the
 * same for every belt colour. The dojo's belt strip solved this by filling a
 * circular badge with the belt colour and rendering the icon on top in white,
 * which is what makes a black belt actually look black; this badge follows
 * that treatment so the two agree on what a dan holder looks like.
 *
 * The annotated return type is load-bearing: the switch has no `default`, so
 * with `noImplicitReturns` off a newly added reason would otherwise widen the
 * return to `ReactElement | undefined` and silently render no badge.
 */
function ReasonBadge({ reason }: { reason: AdFreeRedemptionBlock }): ReactElement {
  switch (reason) {
    case 'dan_rank':
      return (
        <span className={BADGE_CLASS} style={{ backgroundColor: DAN_BELT_HEX }}>
          <GiBlackBelt aria-hidden="true" className={`${BADGE_ICON_CLASS} text-white`} />
        </span>
      );
    case 'subscription':
      return (
        <span className={`${BADGE_CLASS} bg-primary`}>
          <HiShieldCheck
            aria-hidden="true"
            className={`${BADGE_ICON_CLASS} text-primary-foreground`}
          />
        </span>
      );
  }
}

type Props = {
  reason: AdFreeRedemptionBlock;
  /** The redeem card, rendered dimmed and inert underneath the notice. */
  children: ReactNode;
};

/**
 * Covers the redeem card for users whose ads are already suppressed by dan
 * rank or a subscription, stating that spending coins here would buy them
 * nothing.
 *
 * @design Cover, don't replace
 *
 * Swapping the card out for a bare paragraph would make the section's height
 * depend on who is looking, leaving a loading skeleton nothing stable to
 * imitate. Keeping the card mounted under the notice holds the box.
 *
 * Covering is right HERE and nowhere else, because these are the only readers
 * for whom the card's content is irrelevant — they will never use this
 * exchange, so hiding what it offers costs them nothing. An empty balance is
 * the opposite case: that reader needs to read the offer, so those controls
 * are merely disabled and nothing is laid over them.
 *
 * The covered card is `inert` + `aria-hidden`, so the amount input and the
 * submit button are unreachable by pointer, keyboard and assistive tech —
 * a visual cover alone would leave a tab-reachable form whose submit is
 * guaranteed to fail in `redeemAdFree`. Stacking is a single-cell grid
 * rather than `position: absolute` so the cell grows to whichever of the
 * two layers is taller and the notice can never be clipped on narrow
 * screens.
 */
export function RedeemNoticeOverlay({ reason, children }: Props) {
  const t = useTranslations('MypagePoints');

  return (
    <div className="grid">
      <div inert aria-hidden="true" className="col-start-1 row-start-1 opacity-60 select-none">
        {children}
      </div>

      <div className="col-start-1 row-start-1 z-10 flex items-center justify-center rounded-xl bg-card/50 p-6 backdrop-blur-xs">
        <div className="flex flex-col items-center gap-2 text-center">
          <ReasonBadge reason={reason} />
          <p className="text-sm font-semibold text-foreground">
            {t(`redeem.notice.${reason}.title`)}
          </p>
          <p className="text-sm text-muted-foreground">{t(`redeem.notice.${reason}.body`)}</p>
        </div>
      </div>
    </div>
  );
}
