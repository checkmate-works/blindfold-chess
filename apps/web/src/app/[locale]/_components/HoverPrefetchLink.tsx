'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';

import Link from 'next/link';

type Props = ComponentProps<typeof Link>;

/**
 * A `<Link>` that prefetches on pointer intent instead of on entering the
 * viewport.
 *
 * @design Why not just `prefetch={false}`
 * Next's default prefetches every link the moment it scrolls into view, which
 * for always-mounted chrome means the whole menu is prefetched on every page
 * load to serve the one link that eventually gets clicked — and for a dynamic
 * destination each of those costs an Edge auth round trip plus a partial
 * render. `prefetch={false}` removes that, but it disables prefetching
 * outright: there is no hover fallback, so every click then pays a full round
 * trip. Use this component where both matter — chrome that is mounted
 * everywhere yet is the primary way users navigate.
 *
 * Passing `null` (rather than `true`) once intent is seen restores Next's
 * default strategy for that link, so a dynamic route still gets the partial
 * prefetch up to its nearest `loading.tsx` rather than a full-payload one.
 * This is Next's documented hover-prefetch pattern; see the "Disabled
 * Prefetch" section of `01-app/02-guides/prefetching.md` in the `next` package.
 */
export function HoverPrefetchLink({ onMouseEnter, onTouchStart, ...props }: Props) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
