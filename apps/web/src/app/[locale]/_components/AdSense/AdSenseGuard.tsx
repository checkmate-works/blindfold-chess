import { IS_LOCAL_DEV } from '@/config';

import { shouldShowAds } from '@/lib/ad';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';

type Props = {
  slot: 'content-middle' | 'content-bottom';
  slotId: string;
  className?: string;
};

export async function AdSenseGuard({ slot, slotId, className }: Props) {
  if (IS_LOCAL_DEV) {
    return <AdPlaceholder slot={slot} />;
  }

  const showAds = await shouldShowAds();
  if (!showAds) return null;

  return <AdSenseDisplay slot={slot} slotId={slotId} className={className} />;
}
