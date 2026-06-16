import { AD_SLOT_DIMENSIONS, type AdSlotKind } from './ad-slot-dimensions';

type AdPlaceholderProps = {
  slot: AdSlotKind;
};

export function AdPlaceholder({ slot }: AdPlaceholderProps) {
  return (
    <div
      className={`mx-auto flex items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg text-muted-foreground text-sm ${AD_SLOT_DIMENSIONS[slot].placeholder}`}
    >
      Ad Placeholder ({slot})
    </div>
  );
}
