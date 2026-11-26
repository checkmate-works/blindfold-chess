import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";
import { isExamPassed, type DojoExam } from "./exams";
import { recordPassedExam } from "./passed-exams";

/**
 * Pass or fail for a dojo exam run, at the top of its result. A pass is
 * recorded on the device as it is shown, so the dojo reads the new rank as
 * soon as the result closes.
 */
export function ExamVerdictCard({
  exam,
  result,
}: {
  readonly exam: DojoExam;
  readonly result: { readonly accuracy: number; readonly solved: number };
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const passed = isExamPassed(exam, result);
  const rank = t(`ranks.names.${exam.rank}`);

  useEffect(() => {
    if (passed) void recordPassedExam(exam.rank);
  }, [passed, exam.rank]);

  return (
    <View
      testID="exam-verdict"
      style={[
        styles.card,
        { backgroundColor: passed ? colors.successSoft : colors.muted },
      ]}
    >
      <Ionicons
        name={passed ? "ribbon" : "refresh-circle-outline"}
        size={32}
        color={passed ? colors.successSoftForeground : colors.mutedForeground}
      />
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: passed ? colors.successSoftForeground : colors.foreground },
        ]}
      >
        {passed
          ? t("dojo.exam.passed", { rank })
          : t("dojo.exam.failed", { rank })}
      </Text>
      <Text style={[styles.body, { color: colors.foreground }]}>
        {passed
          ? t("dojo.exam.passedBody", { rank })
          : t("dojo.exam.rule", {
              count: exam.fens.length,
              accuracy: exam.minAccuracy,
            })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: "center",
  },
});
