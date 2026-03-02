'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';

import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';

type Props = {
  activePiece: 'k' | 'q' | 'r' | 'b' | 'n';
  selectedFile: string | null;
  selectedRank: string | null;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  children?: React.ReactNode;
};

export function PieceCoordinateInput({
  activePiece,
  selectedFile,
  selectedRank,
  onFileToggle,
  onRankToggle,
  children,
}: Props) {
  const selectedFilesSet = selectedFile ? new Set([selectedFile]) : new Set<string>();
  const selectedRanksSet = selectedRank ? new Set([selectedRank]) : new Set<string>();

  return (
    <div className="flex flex-col gap-3 p-4 bg-card rounded-lg border border-border">
      {/* Piece Row (Read Only Indicator) */}
      <div className="flex gap-2 justify-center">
        {(['k', 'q', 'r', 'b', 'n'] as const).map((piece) => (
          <button
            key={piece}
            disabled
            className={`w-9 h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
              piece === activePiece
                ? 'bg-primary text-primary-foreground border-primary opacity-100'
                : 'bg-background border-border opacity-50'
            }`}
          >
            <ChessPiece type={piece} color="w" size={24} />
          </button>
        ))}
      </div>

      {/* File Selection */}
      <CoordinateInput
        selectedFiles={selectedFilesSet}
        onFileToggle={onFileToggle}
        showRanks={false}
      />

      {/* Rank Selection */}
      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
        <CoordinateInput
          selectedRanks={selectedRanksSet}
          onRankToggle={onRankToggle}
          showFiles={false}
        />
      </div>

      {children}
    </div>
  );
}
