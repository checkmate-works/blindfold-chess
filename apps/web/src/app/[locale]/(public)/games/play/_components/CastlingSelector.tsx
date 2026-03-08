'use client';

const CASTLING_OPTIONS = ['O-O', 'O-O-O'] as const;

type Props = {
  castling: string | null;
  onCastlingClick: (castle: 'O-O' | 'O-O-O') => void;
};

export function CastlingSelector({ castling, onCastlingClick }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {CASTLING_OPTIONS.map((castle) => (
        <button
          key={castle}
          onClick={() => onCastlingClick(castle)}
          className={`px-3 h-9 rounded-md font-bold text-xs transition-colors border ${
            castling === castle
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border'
          }`}
        >
          {castle}
        </button>
      ))}
    </div>
  );
}
