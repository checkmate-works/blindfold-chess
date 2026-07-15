import type { ReactNode } from 'react';

export type EngagementCounterSize = 'sm' | 'md' | 'lg';

export type EngagementCounterHitArea = 'none' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<EngagementCounterSize, { text: string; icon: string }> = {
  sm: { text: 'text-sm', icon: 'w-4 h-4' },
  md: { text: 'text-base', icon: 'w-5 h-5' },
  lg: { text: 'text-lg', icon: 'w-6 h-6' },
};

// Padding paired with an equal negative margin: the tap target grows while the
// rendered position of the icon/count stays pixel-identical, so surrounding
// layout is unaffected. The padded box overflows the interactive wrapper but
// still hit-tests to it, so taps on the extra area reach the button/link.
const HIT_AREA_CLASSES: Record<EngagementCounterHitArea, string> = {
  none: '',
  sm: 'p-1 -m-1',
  md: 'p-2 -m-2',
  lg: 'p-3 -m-3',
};

/**
 * Class for the icon element itself; callers size their icon with this so
 * the icon scale stays in sync with the counter text.
 */
export function engagementIconClass(size: EngagementCounterSize = 'md'): string {
  return SIZE_CLASSES[size].icon;
}

type Props = {
  icon: ReactNode;
  count: number;
  size?: EngagementCounterSize;
  hitArea?: EngagementCounterHitArea;
};

/**
 * Icon + count row shared by the engagement affordances (like button,
 * comment counter). Purely presentational — the interactive wrapper
 * (`<button>`, `<Link>`) and its color/focus styles stay at the call site
 * because the semantics differ, while the sizing spec lives here in one
 * place.
 */
export function EngagementCounter({ icon, count, size = 'md', hitArea = 'none' }: Props) {
  return (
    <span
      className={`flex items-center gap-1 ${SIZE_CLASSES[size].text} ${HIT_AREA_CLASSES[hitArea]}`.trim()}
    >
      {icon}
      {count > 0 && <span>{count}</span>}
    </span>
  );
}
