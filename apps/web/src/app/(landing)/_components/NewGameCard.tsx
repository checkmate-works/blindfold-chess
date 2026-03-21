import Link from 'next/link';

import { FaPlus } from 'react-icons/fa';

type Props = {
  locale: string;
  label: string;
};

export function NewGameCard({ locale, label }: Props) {
  return (
    <Link
      href={`/${locale}/games/new`}
      className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group gap-1"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <FaPlus className="text-primary" size={20} />
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </Link>
  );
}
