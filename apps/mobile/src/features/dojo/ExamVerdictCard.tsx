import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import type {
  ExamAnswer,
  ExamProblem,
} from "@blindfold-chess/features/dojo-journey";
import type {
  EarnedRankSlug,
  ExamProblemKind,
} from "@blindfold-chess/features/dojo-ranks";

import { Button } from "../../components";
import { refreshAccount, useAuth } from "../../auth/use-auth";
import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";
import { rankLabel } from "../records/rank-label";
import {
  examRunMode,
  examVerdict,
  runExamProblem,
  type ExamRunOutcome,
} from "./exam-run";
import { useDojoJourney } from "./use-dojo-journey";

/**
 * The verdict on one exam problem, at the top of its session's result.
 *
 * @description
 * Grades the answer once the account state is known (`runExamProblem`):
 * recorded on the server when the run can be, on the device otherwise. While
 * the answer is on its way it says "Recording…"; a send that fails says so
 * and offers to send the same answer again, rather than falling back to a
 * device verdict that would look recorded. Once the server has answered, the
 * account and the dojo progress are re-read so a granted rank and the passed
 * problem show as soon as the result closes.
 */
export function ExamVerdictCard({
  exam,
  kind,
  problem,
  answer,
}: {
  readonly exam: EarnedRankSlug;
  readonly kind: ExamProblemKind;
  readonly problem: ExamProblem;
  readonly answer: ExamAnswer;
}) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const auth = useAuth();
  const { highest, refresh } = useDojoJourney();
  const [outcome, setOutcome] = useState<ExamRunOutcome | undefined>();
  const [sendCount, setSendCount] = useState(0);

  const authResolved = auth.status !== "loading";
  const signedIn = auth.status === "signedIn";
  const accountLoaded = auth.account !== undefined;
  // Decided once per send: a rank arriving mid-flight must not resend.
  const [mode, setMode] = useState<"record" | "practice" | undefined>();
  useEffect(() => {
    if (mode !== undefined || !authResolved) return;
    setMode(examRunMode({ exam, signedIn, accountLoaded, highest }));
  }, [mode, authResolved, exam, signedIn, accountLoaded, highest]);

  useEffect(() => {
    if (mode === undefined) return;
    let cancelled = false;
    setOutcome(undefined);
    void runExamProblem({ exam, kind, problem, answer, mode }).then(
      (result) => {
        if (cancelled) return;
        setOutcome(result);
        if (result.kind === "graded") {
          void refreshAccount();
          void refresh();
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // `answer` and `problem` are fixed for the result screen's lifetime;
    // `sendCount` is the resend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sendCount]);

  if (outcome === undefined) {
    return (
      <View
        testID="exam-verdict"
        style={[styles.card, styles.row, { backgroundColor: colors.muted }]}
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {t("dojo.exam.recording")}
        </Text>
      </View>
    );
  }

  if (outcome.kind === "sendFailed") {
    return (
      <View
        testID="exam-verdict"
        style={[styles.card, { backgroundColor: colors.muted }]}
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.body, { color: feedbackColors.error }]}>
          {t("dojo.exam.recordFailed")}
        </Text>
        <Button
          title={t("dojo.exam.resend")}
          icon="refresh"
          variant="secondary"
          onPress={() => setSendCount((n) => n + 1)}
          testID="exam-resend"
        />
      </View>
    );
  }

  const verdict = examVerdict(outcome);
  const passed = outcome.passed;
  const granted = outcome.kind === "graded" ? outcome.grantedRanks : [];
  return (
    <View
      testID="exam-verdict"
      style={[
        styles.card,
        { backgroundColor: passed ? colors.successSoft : colors.muted },
      ]}
      accessibilityLiveRegion="polite"
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
        {/* dojo.exam.problemPassed / .problemFailed / .passedUnrecorded */}
        {t(`dojo.exam.${verdict}`)}
      </Text>
      {granted.map((slug) => (
        <Text key={slug} style={[styles.body, { color: colors.foreground }]}>
          {t("challenge.promoted", { rank: rankLabel(slug, t) })}
        </Text>
      ))}
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
  row: {
    flexDirection: "row",
    justifyContent: "center",
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
