import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';
import { resolveAdGuard } from './resolveAdGuard';

type Props = {
  slot: 'content-middle' | 'content-bottom';
  slotId: string;
  className?: string;
};

export async function AdSenseGuard({ slot, slotId, className }: Props) {
  const guard = await resolveAdGuard();
  if (guard === 'hidden') return null;
  if (guard === 'placeholder') return <AdPlaceholder slot={slot} />;

  return <AdSenseDisplay slot={slot} slotId={slotId} className={className} />;
}
