type AdPlaceholderProps = {
  slot: 'content-middle' | 'content-bottom' | 'native-ad';
};

const slotStyles: Record<AdPlaceholderProps['slot'], string> = {
  'content-middle': 'max-w-[960px] h-[208px]',
  'content-bottom': 'max-w-[400px] h-[400px]',
  'native-ad': 'w-full h-24',
};

export function AdPlaceholder({ slot }: AdPlaceholderProps) {
  return (
    <div
      className={`mx-auto flex items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg text-muted-foreground text-sm ${slotStyles[slot]}`}
    >
      Ad Placeholder ({slot})
    </div>
  );
}
