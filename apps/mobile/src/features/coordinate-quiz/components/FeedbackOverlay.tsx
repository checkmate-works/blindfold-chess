import { Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { colors, fontSize, fontWeight } from "../../../theme";
import type { AnswerFeedback } from "../lib/types";

type FeedbackOverlayProps = {
  feedback: AnswerFeedback;
};

export function FeedbackOverlay({ feedback }: FeedbackOverlayProps) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (feedback) {
      // Reset values
      opacity.setValue(0);
      scale.setValue(0.8);

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [feedback, opacity, scale]);

  if (!feedback) return null;

  const isCorrect = feedback === "correct";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: isCorrect ? colors.success : colors.error,
        },
      ]}
    >
      <Text style={styles.emoji}>{isCorrect ? "✓" : "✗"}</Text>
      <Text style={styles.text}>
        {isCorrect
          ? t("coordinateQuiz.session.correct")
          : t("coordinateQuiz.session.incorrect")}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 24,
    color: colors.white,
  },
  text: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
