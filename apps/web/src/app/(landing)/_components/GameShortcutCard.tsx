'use client';

import Link from 'next/link';

import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useGameCount } from '../_hooks/use-game-count';

type Props = {
  locale: string;
  label: string;
};

export function GameShortcutCard({ locale, label }: Props) {
  const { count, isLoading } = useGameCount();

  return (
    <Link
      href={`/${locale}/games`}
      className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group gap-1"
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <ChessPieceIcon type="p" color="w" size={28} />
        </div>
        {!isLoading && count > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </Link>
  );
}
