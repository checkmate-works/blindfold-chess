import type { ReactNode } from 'react';

import Link from 'next/link';

type IconColor = 'blue' | 'orange';

const iconColorStyles: Record<IconColor, string> = {
  blue: 'bg-blue-500/10 text-blue-500',
  orange: 'bg-orange-500/10 text-orange-500',
};

type Props = {
  icon: ReactNode;
  iconColor: IconColor;
  title: string;
  description: string;
  href: string;
  cta: string;
};

export function TrainingCard({ icon, iconColor, title, description, href, cta }: Props) {
  return (
    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm flex flex-col">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6 ${iconColorStyles[iconColor]}`}
      >
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-1">{title}</h4>
      <p className="text-muted-foreground flex-grow">{description}</p>
      <div className="mt-8 flex justify-center">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-md bg-secondary px-6 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
