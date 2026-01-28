import { TouchableOpacity, StyleSheet } from "react-native";
import { colors, touchTarget } from "../../../theme";
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

export function ChessBoardSquare({
  square,
  onPress,
  isTarget,
  feedback,
  disabled,
  size,
}: ChessBoardSquareProps) {
  const squareColorType = getSquareColor(square);

  const getBackgroundColor = () => {
    // Show feedback colors when there's feedback and this is the target
    if (feedback && isTarget) {
      return feedback === "correct"
        ? colors.boardHighlightCorrect
        : colors.boardHighlightIncorrect;
    }

    // Default board colors
    return squareColorType === "light" ? colors.boardLight : colors.boardDark;
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
}

const styles = StyleSheet.create({
  square: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
  },
});
