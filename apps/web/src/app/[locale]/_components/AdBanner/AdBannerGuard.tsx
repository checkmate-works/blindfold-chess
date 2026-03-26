import { shouldShowAds } from '@/lib/ad';

import { AdBanner } from './AdBanner';

type Props = {
  slot: string;
};

export async function AdBannerGuard({ slot }: Props) {
  const showAds = await shouldShowAds();
  if (!showAds) return null;

  return <AdBanner slot={slot} />;
}
