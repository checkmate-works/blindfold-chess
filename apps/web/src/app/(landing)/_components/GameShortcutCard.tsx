'use client';

import { IconShortcutCard } from '@/app/_components/IconShortcutCard';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useGameCount } from '../_hooks/use-game-count';

type Props = {
  locale: string;
  label: string;
};

export function GameShortcutCard({ locale, label }: Props) {
  const { count, isLoading } = useGameCount();

  return (
    <IconShortcutCard
      href={`/${locale}/games`}
      label={label}
      icon={<ChessPieceIcon type="p" color="w" size={28} />}
      overlay={
        !isLoading && count > 0 ? (
          <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {count > 99 ? '99+' : count}
          </span>
        ) : null
      }
    />
  );
}
