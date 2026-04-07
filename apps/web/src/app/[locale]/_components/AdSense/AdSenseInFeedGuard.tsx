import { shouldShowAds } from '@/lib/ad';

import { AdSenseInFeed } from './AdSenseInFeed';

type Props = {
  slotId: string;
  layoutKey: string;
};

export async function AdSenseInFeedGuard({ slotId, layoutKey }: Props) {
  const showAds = await shouldShowAds();
  if (!showAds) return null;

  return <AdSenseInFeed slotId={slotId} layoutKey={layoutKey} />;
}
