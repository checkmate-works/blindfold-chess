import { ChessBoard } from '@/app/_components';

import type { BoardAnnotations } from '@/lib/board-annotations/types';

type Position = {
  fen: string;
  sortOrder: number;
  caption?: string;
  annotations?: BoardAnnotations;
};

type Props = {
  positions: Position[];
};

export function GlossaryPositionBoard({ positions }: Props) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-4">
      {positions.map((pos, index) => (
        <div key={index} className="w-72">
          <ChessBoard
            fen={pos.fen}
            showCoordinates={true}
            rounded={true}
            annotations={pos.annotations ?? null}
          />
          {pos.caption && (
            <p className="mt-1 text-sm text-muted-foreground text-center">{pos.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
