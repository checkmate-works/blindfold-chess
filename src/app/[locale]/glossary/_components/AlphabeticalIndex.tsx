import { Link } from '@/i18n/routing';
import { chessTerms } from '../_data/chess-terms';

interface AlphabeticalIndexProps {
  locale: string;
  currentLetter?: string;
}

export async function AlphabeticalIndex({ locale, currentLetter }: AlphabeticalIndexProps) {
  // Get all unique first letters
  const alphabet = [...new Set(chessTerms.map((term) => term.term.charAt(0).toUpperCase()))].sort();

  return (
    <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
      {alphabet.map((letter) => {
        const count = chessTerms.filter(
          (term) => term.term.charAt(0).toUpperCase() === letter
        ).length;
        const isActive = currentLetter === letter.toLowerCase();

        return (
          <Link
            key={letter}
            href={`/glossary/letter/${letter.toLowerCase()}`}
            locale={locale}
            className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border transition-colors ${
              isActive ? 'bg-muted border-foreground/20' : 'bg-card hover:bg-muted/50 border-border'
            }`}
          >
            <span className="text-2xl font-bold">{letter}</span>
            <span className="text-sm mt-1 opacity-70">{count}</span>
          </Link>
        );
      })}
    </div>
  );
}
