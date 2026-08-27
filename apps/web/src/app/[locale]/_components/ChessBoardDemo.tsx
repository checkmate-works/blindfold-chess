import { BoardFrame, ChessBoard } from '@/app/_components';

type DemoType = 'board-normal' | 'single-colored' | 'stones';

type Props = {
  type: DemoType;
};

const DEMO_FEN = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

export function ChessBoardDemo({ type }: Props) {
  const config = getDemoConfig(type);

  return (
    <div className="my-8">
      <BoardFrame expandOnMobile className="aspect-square">
        <ChessBoard
          fen={DEMO_FEN}
          showCoordinates={true}
          showOwnPieces={true}
          showOpponentPieces={true}
          pieceShapeMode={config.pieceShapeMode}
          pieceColors={config.pieceColors}
          boardTheme="lichess"
        />
      </BoardFrame>
    </div>
  );
}

function getDemoConfig(type: DemoType) {
  switch (type) {
    case 'board-normal':
      return {
        pieceShapeMode: 'normal' as const,
        pieceColors: 'normal' as const,
      };
    case 'single-colored':
      return {
        pieceShapeMode: 'normal' as const,
        pieceColors: 'white-only' as const,
      };
    case 'stones':
      return {
        pieceShapeMode: 'circles-all' as const,
        pieceColors: 'normal' as const,
      };
  }
}
