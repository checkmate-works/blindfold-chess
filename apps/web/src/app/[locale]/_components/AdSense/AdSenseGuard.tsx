import { shouldShowAds } from '@/lib/ad';

import { AdSenseDisplay } from './AdSenseDisplay';

type Props = {
  slot: 'content-middle' | 'content-bottom';
  slotId: string;
  className?: string;
};

export async function AdSenseGuard({ slot, slotId, className }: Props) {
  const showAds = await shouldShowAds();
  if (!showAds) return null;

  return <AdSenseDisplay slot={slot} slotId={slotId} className={className} />;
}
