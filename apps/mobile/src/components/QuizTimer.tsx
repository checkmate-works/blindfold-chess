import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme, fontSize, fontWeight } from "../theme";
import { formatTime } from "@blindfold-chess/features/coordinate-quiz";
import { getQuizTimerUrgency } from "./quiz-timer-urgency";

type QuizTimerProps = {
  /** Whole seconds left, rendered as `m:ss`. */
  timeRemaining: number;
  /**
   * Fraction of the time limit still remaining, 0 to 1 (`timeRemaining /
   * limit`, so 1 at the start). The colour turns to warning under 40% and to
   * error under 20%; see `getQuizTimerUrgency`.
   */
  progress: number;
  /** Diameter in points. */
  size?: number;
};

export function QuizTimer({
  timeRemaining,
  progress,
  size = 80,
}: QuizTimerProps) {
  const { colors, feedbackColors } = useTheme();
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (1 - progress));

  const getTimerColor = () => {
    switch (getQuizTimerUrgency(progress)) {
      case "critical":
        return feedbackColors.error;
      case "warning":
        return feedbackColors.warning;
      case "normal":
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getTimerColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.timeContainer}>
        <Text style={[styles.time, { color: getTimerColor() }]}>
          {formatTime(timeRemaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  timeContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  time: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
