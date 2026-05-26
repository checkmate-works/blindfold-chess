import { Skeleton } from '@/app/[locale]/_components';

import {
  INLINE_BOARD_CARD_CHROME,
  INLINE_BOARD_HEADER_CHROME,
  INLINE_BOARD_HEADER_MIN_H,
} from '../../_lib/skeleton-layout-classes';

/**
 * Skeleton for the collapsed `InlineBoardView` header (accordion trigger).
 * Outer card + header chrome are imported from
 * `skeleton-layout-classes.ts` so the placeholder height tracks any tweak
 * to padding / border / font size in the real header without manual
 * resync. See the constants' inline docs for the design rationale behind
 * each one.
 */
export function InlineBoardHeaderSkeleton() {
  return (
    <div aria-hidden className={INLINE_BOARD_CARD_CHROME}>
      <div className={`${INLINE_BOARD_HEADER_CHROME} ${INLINE_BOARD_HEADER_MIN_H}`}>
        <div className="flex items-center gap-2">
          <Skeleton disableAnimation className="h-4 w-4 rounded-sm" />
          <Skeleton disableAnimation className="h-4 w-24" />
        </div>
        <Skeleton disableAnimation className="h-3 w-3 rounded-sm" />
      </div>
    </div>
  );
}
