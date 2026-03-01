import { memo } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useTheme, touchTarget } from "../../../theme";
import type { Square, AnswerFeedback } from "../lib/types";
import { getSquareColor } from "../lib/utils";

type ChessBoardSquareProps = {
  square: Square;
  onPress: (square: Square) => void;
  isTarget: boolean;
  feedback: AnswerFeedback;
  disabled: boolean;
  size: number;
};

export const ChessBoardSquare = memo(function ChessBoardSquare({
  square,
  onPress,
  isTarget,
  feedback,
  disabled,
  size,
}: ChessBoardSquareProps) {
  const { chessColors } = useTheme();
  const squareColorType = getSquareColor(square);

  const getBackgroundColor = () => {
    // Show feedback colors when there's feedback and this is the target
    if (feedback && isTarget) {
      return feedback === "correct"
        ? chessColors.boardHighlightCorrect
        : chessColors.boardHighlightIncorrect;
    }

    // Default board colors
    return squareColorType === "light"
      ? chessColors.boardLight
      : chessColors.boardDark;
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(square)}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.square,
        {
          width: size,
          height: size,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  square: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
  },
});
