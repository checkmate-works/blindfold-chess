import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme, fontSize, fontWeight } from "../../../theme";
import { formatTime } from "../lib/utils";

type QuizTimerProps = {
  timeRemaining: number;
  progress: number; // 0 to 1
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

  // Color based on remaining time
  const getTimerColor = () => {
    if (progress > 0.8) return feedbackColors.error;
    if (progress > 0.6) return feedbackColors.warning;
    return colors.primary;
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
