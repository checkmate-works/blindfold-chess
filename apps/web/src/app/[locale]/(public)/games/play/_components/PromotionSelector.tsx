'use client';

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

const PROMOTION_PIECES: PromotionPiece[] = ['q', 'r', 'b', 'n'];

type Props = {
  promotionPiece: PromotionPiece | null;
  onPromotionPieceChange: (piece: PromotionPiece) => void;
};

export function PromotionSelector({ promotionPiece, onPromotionPieceChange }: Props) {
  return (
    <div className="flex justify-center w-full animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex gap-1 justify-center w-full">
        <div className="flex items-center justify-center w-9 h-9 font-bold text-lg select-none text-muted-foreground">
          =
        </div>
        {PROMOTION_PIECES.map((p) => (
          <button
            key={p}
            onClick={() => onPromotionPieceChange(p)}
            className={`flex-1 min-w-0 h-9 rounded-md font-mono text-lg transition-colors border max-w-[3rem] ${
              promotionPiece === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
