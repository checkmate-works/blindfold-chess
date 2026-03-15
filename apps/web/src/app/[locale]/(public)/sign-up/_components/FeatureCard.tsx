import type { ReactNode } from 'react';

type BadgeVariant = 'comingSoon' | 'planning';

const badgeStyles: Record<BadgeVariant, string> = {
  comingSoon: 'bg-info/10 text-info',
  planning: 'bg-accent-orange/10 text-accent-orange',
};

type IconColor = 'blue' | 'orange';

const iconColorStyles: Record<IconColor, string> = {
  blue: 'bg-info/10 text-info',
  orange: 'bg-accent-orange/10 text-accent-orange',
};

type Props = {
  icon: ReactNode;
  iconColor: IconColor;
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
};

export function FeatureCard({
  icon,
  iconColor,
  title,
  description,
  badgeLabel,
  badgeVariant,
}: Props) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${iconColorStyles[iconColor]}`}
        >
          {icon}
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${badgeStyles[badgeVariant]}`}
        >
          {badgeLabel}
        </span>
      </div>
      <h4 className="text-base font-bold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
