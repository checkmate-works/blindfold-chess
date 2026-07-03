import { useCallback, useState } from 'react';

type Props = {
  originalMovesLength: number;
  gamePositions: { fen: string }[];
};

export function useRecallNavigation({ originalMovesLength, gamePositions }: Props) {
  const [currentPosition, setCurrentPosition] = useState(-1);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [displayFen, setDisplayFen] = useState<string | null>(null);

  const navigateToPosition = useCallback(
    (position: number) => {
      if (position === -1 || position >= originalMovesLength) {
        setCurrentPosition(-1);
        setDisplayFen(null);
        setSelectedMoveIndex(null);
        return;
      }

      const posData = gamePositions[position + 1];
      if (posData) {
        setCurrentPosition(position);
        setDisplayFen(posData.fen);
        setSelectedMoveIndex(position);
      } else {
        setCurrentPosition(-1);
        setDisplayFen(null);
        setSelectedMoveIndex(null);
      }
    },
    [originalMovesLength, gamePositions]
  );

  const navigateToStart = useCallback(() => {
    setDisplayFen(gamePositions[0]?.fen ?? null);
    setCurrentPosition(-2);
    setSelectedMoveIndex(null);
  }, [gamePositions]);

  const navigateToEnd = useCallback(() => {
    setCurrentPosition(-1);
    setDisplayFen(null);
    setSelectedMoveIndex(null);
  }, []);

  const navigatePrevious = useCallback(() => {
    if (currentPosition === -2) {
      return;
    }

    if (currentPosition === -1) {
      if (originalMovesLength > 0) {
        navigateToPosition(originalMovesLength - 2);
      }
    } else if (currentPosition === 0) {
      navigateToStart();
    } else {
      navigateToPosition(currentPosition - 1);
    }
  }, [currentPosition, originalMovesLength, navigateToPosition, navigateToStart]);

  const navigateNext = useCallback(() => {
    if (currentPosition === -2) {
      if (originalMovesLength > 0) {
        navigateToPosition(0);
      }
    } else if (currentPosition === -1) {
      return;
    } else {
      const newPosition = currentPosition + 1;
      if (newPosition < originalMovesLength) {
        navigateToPosition(newPosition);
      }
    }
  }, [currentPosition, originalMovesLength, navigateToPosition]);

  return {
    currentPosition,
    setCurrentPosition,
    selectedMoveIndex,
    setSelectedMoveIndex,
    displayFen,
    setDisplayFen,
    navigateToPosition,
    navigateToStart,
    navigateToEnd,
    navigatePrevious,
    navigateNext,
  };
}
