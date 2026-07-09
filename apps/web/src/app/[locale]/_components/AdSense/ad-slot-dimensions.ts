export type AdSlotKind = 'content-middle' | 'content-bottom' | 'native-ad';

/**
 * Single source of truth for the vertical space each ad slot reserves.
 *
 * Reserving the slot height at SSR — on the server-rendered
 * `.ad-slot-wrapper` (see `AdSlot`) — is what stops AdSense fill from
 * pushing the rest of the page down after hydration. That post-paint shove
 * was the root cause of the mobile CLS regression flagged in Search Console:
 * the `<ins data-ad-format="auto">` starts at height 0 and only grows once
 * Google fills it, so every byte below it jumped.
 *
 * - `reserveMinH` is a `min-h-*` (not a fixed `h-*`) so a taller-than-expected
 *   fill still grows the box instead of clipping the ad (clipping ads is an
 *   AdSense policy violation). Only the height is reserved — width is left to
 *   the responsive ad so its rendered size / fill behaviour is unchanged.
 * - `placeholder` is the fixed-size dashed box shown only in local dev
 *   (`AdPlaceholder`). It carries `max-w-*` purely for the local mock's looks.
 *
 * Both derive from the same heights so the reserved space and the local
 * preview never drift. Class strings are written as literals (no
 * interpolation) so Tailwind's JIT scanner can see them.
 */
export const AD_SLOT_DIMENSIONS: Record<AdSlotKind, { reserveMinH: string; placeholder: string }> =
  {
    'content-middle': { reserveMinH: 'min-h-[208px]', placeholder: 'h-[208px] max-w-[960px]' },
    'content-bottom': { reserveMinH: 'min-h-[400px]', placeholder: 'h-[400px] max-w-[400px]' },
    'native-ad': { reserveMinH: 'min-h-24', placeholder: 'h-24 w-full' },
  };
