import type { BannerPayload } from './payload';

/** The `/api/ad-slot/[slot]` response: the resolved banner creative, or null. */
export type AdSlotResolution = {
  creative: { href: string; payload: BannerPayload } | null;
};
