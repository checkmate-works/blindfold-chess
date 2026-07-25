// Note: Using standard next/link instead of @/i18n/routing Link
// to avoid DYNAMIC_SERVER_USAGE errors in production.
// Server Components should use standard Link with explicit locale in href.
import Link from 'next/link';

import { getLetterCounts } from '../_lib/queries';

type Props = {
  currentLetter?: string;
  locale: string;
};

export async function AlphabeticalIndex({ currentLetter, locale }: Props) {
  const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const letterCounts = await getLetterCounts();

  return (
    <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
      {alphabet.map((letter) => {
        const count = letterCounts[letter] || 0;
        const isActive = currentLetter === letter.toLowerCase();

        return (
          <Link
            key={letter}
            href={`/${locale}/glossary/letter/${letter.toLowerCase()}`}
            className={`flex flex-col items-center justify-center rounded-lg border p-2 transition-colors ${
              isActive ? 'bg-muted border-foreground/20' : 'bg-card hover:bg-muted/50 border-border'
            }`}
          >
            <span className="text-lg font-bold leading-none">{letter}</span>
            <span className="mt-0.5 text-xs leading-none opacity-70">{count}</span>
          </Link>
        );
      })}
    </div>
  );
}
