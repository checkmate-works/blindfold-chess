import { HiMiniStar } from 'react-icons/hi2';

type RequirementsListProps = {
  items: string[];
  className?: string;
  iconSize?: string;
  textSize?: string;
};

export function RequirementsList({
  items,
  className = 'space-y-2',
  iconSize = 'size-4',
  textSize = 'text-sm',
}: RequirementsListProps) {
  return (
    <ul className={className}>
      {items.map((label, i) => (
        <li key={i} className={`flex items-start gap-2 ${textSize} text-foreground`}>
          <HiMiniStar className={`mt-0.5 ${iconSize} shrink-0 text-amber-500`} />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
