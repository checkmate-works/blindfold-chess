import Link from 'next/link';
import { PlusIcon } from './Icons';
import type { Locale } from '../_lib/types';

interface NewGameCardProps {
  locale: Locale;
  disabled?: boolean;
  translations: {
    newGame: string;
    newGameDescription: string;
    playAsWhite: string;
    playAsBlack: string;
    vsComputer: string;
    maxGamesReached?: string;
  };
}

const MAX_GAMES = 50;

export function NewGameCard({ locale, disabled = false, translations }: NewGameCardProps) {
  if (disabled) {
    return (
      <div className="w-full">
        <button
          disabled
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium rounded-xl cursor-not-allowed"
        >
          <PlusIcon className="w-6 h-6" />
          <span>{translations.newGame}</span>
        </button>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          {translations.maxGamesReached || `Maximum games (${MAX_GAMES}) reached`}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/${locale}/game/new`}
      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-card hover:bg-muted/30 text-foreground font-medium rounded-xl border border-border hover:border-muted-foreground transition-colors touch-manipulation"
    >
      <PlusIcon className="w-6 h-6" />
      <span>{translations.newGame}</span>
    </Link>
  );
}
