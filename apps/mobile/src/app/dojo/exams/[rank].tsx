import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  DOJO_EXAMS,
  examProblemKinds,
  examProblemRule,
  examProblemSegment,
  examRankOf,
} from "@blindfold-chess/features/dojo-journey";
import {
  previousRankSlug,
  type ExamProblemKind,
} from "@blindfold-chess/features/dojo-ranks";

import { ListIcon, ListRow, ListSection, Screen } from "../../../components";
import { useAuth } from "../../../auth/use-auth";
import { SignInRow } from "../../../features/account/SignInRow";
import { examRunMode } from "../../../features/dojo/exam-run";
import { RankGoalCard } from "../../../features/dojo/RankGoalCard";
import { useDojoJourney } from "../../../features/dojo/use-dojo-journey";
import { fontSize, spacing, useTheme } from "../../../theme";

/**
 * Dojo exam (道場の課題)
 *
 * @description
 * A rank's exam: the rank's card, how many problems earn it, then one row
 * per problem — its name, its rule (memorize for n seconds and reach the
 * accuracy; find the mate in n), and "Passed" once the server has recorded
 * it. A row opens that problem's page (`dojo/exams/[rank]/[problem]`), whose
 * Start opens the session (position memory or puzzle, with the `exam`
 * param); its result screen grades the answer and records a pass when it
 * can.
 *
 * Every problem can be retried as often as the player likes. When a pass
 * cannot be recorded — signed out, or the rank below not held yet — a note
 * says so (signed out, as the sign-in row); the problems still run, as
 * practice.
 *
 * @flow
 * 1. Opened from the rank's exam requirements in the dojo or on the home tab
 * 2. A problem row → its page → its session → its result (verdict,
 *    recorded or not)
 * 3. Back from the problem's page returns here, with the problem marked
 *    once passed
 */
export default function DojoExamScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const { highest, signedIn, journeyOf } = useDojoJourney();
  const params = useLocalSearchParams<{ rank: string }>();
  const rank = examRankOf(params.rank);
  const exam = rank ? DOJO_EXAMS[rank] : undefined;
  if (!rank || !exam) return null;

  const rankName = t(`ranks.names.${rank}`);
  const journey = journeyOf(rank);
  const kinds = examProblemKinds(rank);
  const passedKinds = new Set(
    journey.steps.flatMap((step) =>
      step.kind === "requirement" &&
      step.done &&
      step.requirement.type === "exam_problem"
        ? [step.requirement.problem]
        : [],
    ),
  );
  const mode = examRunMode({
    exam: rank,
    signedIn,
    accountLoaded: auth.account !== undefined,
    highest,
  });
  const prevRank = previousRankSlug(rank);
  // Signed out, the note is the sign-in row, so the way to have a pass
  // recorded is one tap away; a build without accounts keeps the sentence.
  const signInRow = auth.status === "signedOut";
  const note = signInRow
    ? undefined
    : !signedIn
      ? t("dojo.exam.signInNote")
      : mode === "practice"
        ? t("dojo.exam.lockedNote", { prevRank: t(`ranks.names.${prevRank}`) })
        : undefined;

  const open = (kind: ExamProblemKind) =>
    router.push(`/dojo/exams/${rank}/${examProblemSegment(kind)}` as Href);

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen
        options={{ title: t("dojo.exam.title", { rank: rankName }) }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <RankGoalCard slug={rank} standing={journey.standing} />
        <Text style={[styles.lead, { color: colors.foreground }]}>
          {t("dojo.exam.lead", { count: kinds.length, rank: rankName })}
        </Text>
        <ListSection>
          {kinds.map((kind) => {
            const rule = examProblemRule(exam[kind]);
            const solved = passedKinds.has(kind);
            return (
              <ListRow
                key={kind}
                leading={
                  <ListIcon
                    ionicon={
                      kind === "position_memory"
                        ? "eye-outline"
                        : "extension-puzzle-outline"
                    }
                  />
                }
                // ranks.requirement.examProblemNames.position_memory / .puzzle
                title={t(`ranks.requirement.examProblemNames.${kind}`)}
                // dojo.exam.memoryRule / .memoryRulePerfect / .puzzleRule
                subtitle={t(`dojo.exam.${rule.key}`, rule.values)}
                value={solved ? t("dojo.exam.solved") : undefined}
                accessory="chevron"
                onPress={() => open(kind)}
                testID={`exam-problem-${kind}`}
              />
            );
          })}
        </ListSection>
        {signInRow && (
          <SignInRow
            ionicon="ribbon"
            benefit={t("dojo.exam.signInNote")}
            testID="exam-sign-in"
          />
        )}
        {note && (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            {note}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  lead: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  note: {
    fontSize: fontSize.xs,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
