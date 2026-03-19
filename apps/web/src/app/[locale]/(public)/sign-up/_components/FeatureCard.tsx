import type { ReactNode } from 'react';

type IconColor = 'blue' | 'orange' | 'purple' | 'green';

const iconColorStyles: Record<IconColor, string> = {
  blue: 'bg-info/10 text-info',
  orange: 'bg-accent-orange/10 text-accent-orange',
  purple: 'bg-accent-purple/10 text-accent-purple',
  green: 'bg-success/10 text-success',
};

type Props = {
  icon: ReactNode;
  iconColor: IconColor;
  title: string;
  description: string;
};

export function FeatureCard({ icon, iconColor, title, description }: Props) {
  return (
    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center text-xl ${iconColorStyles[iconColor]}`}
      >
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold mb-0.5">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
