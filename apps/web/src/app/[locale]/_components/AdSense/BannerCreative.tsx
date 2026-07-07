import Image from 'next/image';

import type { BannerPayload } from '@/lib/ads/payload';

type Props = {
  payload: BannerPayload;
  href: string;
  /** Ad-disclosure label (e.g. "PR"). Required — first-party ads must be
   * clearly recognizable as ads (景表法 / stealth-marketing rules). */
  label: string;
};

/**
 * First-party image banner (Amazon/Awin affiliate creative). Renders inside an
 * `<AdSlot>`, which owns the `.ad-slot-wrapper` hide hook and height reserve —
 * this component is just the image + link + disclosure.
 *
 * `rel="sponsored"` marks the affiliate link per Google's link-attribute
 * guidance; `unoptimized` skips Vercel Image Optimization (the source is a
 * pre-sized creative, external or in Storage, so optimization adds cost/config
 * for no benefit).
 */
export function BannerCreative({ payload, href, label }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="relative mx-auto block w-fit"
    >
      <Image
        src={payload.imagePath}
        alt={payload.alt}
        width={payload.width}
        height={payload.height}
        className="h-auto max-w-full"
        unoptimized
      />
      <span className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[10px] font-medium leading-tight text-white">
        {label}
      </span>
    </a>
  );
}
