import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  DOJO_EXAMS,
  type ExamProblem,
} from "@blindfold-chess/features/dojo-journey";
import {
  RANK_REQUIREMENTS,
  RANK_SLUGS,
  isRankSlug,
  type EarnedRankSlug,
  type ExamProblemKind,
} from "@blindfold-chess/features/dojo-ranks";

import { ListIcon, ListRow, ListSection, Screen } from "../../../components";
import { useAuth } from "../../../auth/use-auth";
import { examRunMode } from "../../../features/dojo/exam-run";
import { RankGoalCard } from "../../../features/dojo/RankGoalCard";
import { useDojoJourney } from "../../../features/dojo/use-dojo-journey";
import { fontSize, spacing, useTheme } from "../../../theme";

/** The problem kinds of `rank`'s exam, in the order its requirements list them. */
function examProblemKinds(rank: EarnedRankSlug): ExamProblemKind[] {
  return RANK_REQUIREMENTS[rank].flatMap((requirement) =>
    requirement.type === "exam_problem" ? [requirement.problem] : [],
  );
}

/** How many of its moves the player makes in a puzzle's first line. */
function playerMoveCount(problem: ExamProblem): number {
  if (problem.kind !== "puzzle") return 0;
  return Math.ceil((problem.solutions[0]?.length ?? 0) / 2);
}

/**
 * Dojo exam (道場の課題)
 *
 * @description
 * A rank's exam: the rank's card, how many problems earn it, then one row
 * per problem — its name, its rule (memorize for n seconds and reach the
 * accuracy; find the mate in n), and "Passed" once the server has recorded
 * it. A row opens that problem's session (position memory or puzzle, with
 * the `exam` param); its result screen grades the answer and records a pass
 * when it can, and closing the result returns here.
 *
 * Every problem can be retried as often as the player likes. When a pass
 * cannot be recorded — signed out, or the rank below not held yet — a note
 * says so up front; the problems still run, as practice.
 *
 * @flow
 * 1. Opened from the rank's exam requirements in the dojo or on the home tab
 * 2. A problem row → its session → its result (verdict, recorded or not)
 * 3. Closing the result returns here, with the problem marked once passed
 */
export default function DojoExamScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const { highest, signedIn, journeyOf } = useDojoJourney();
  const { rank } = useLocalSearchParams<{ rank: string }>();
  const exam =
    isRankSlug(rank) && rank !== "mukyu" ? DOJO_EXAMS[rank] : undefined;
  if (!exam || !isRankSlug(rank) || rank === "mukyu") return null;

  const rankName = t(`ranks.names.${rank}`);
  const journey = journeyOf(rank);
  const kinds = examProblemKinds(rank).filter((kind) => exam[kind]);
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
  const prevRank = RANK_SLUGS[RANK_SLUGS.indexOf(rank) - 1];
  const note = !signedIn
    ? t("dojo.exam.signInNote")
    : mode === "practice" && prevRank
      ? t("dojo.exam.lockedNote", { prevRank: t(`ranks.names.${prevRank}`) })
      : undefined;

  const open = (kind: ExamProblemKind) =>
    router.push({
      pathname:
        kind === "position_memory"
          ? "/practice/position-memory/session"
          : "/practice/puzzle/session",
      params: { exam: rank },
    });

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
            const problem = exam[kind];
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
                subtitle={
                  problem.kind === "position_memory"
                    ? // "100% or better" reads oddly, so a perfect-recreation
                      // mark has its own wording.
                      problem.minAccuracy === 100
                      ? t("dojo.exam.memoryRulePerfect", {
                          seconds: problem.memorizeSeconds,
                        })
                      : t("dojo.exam.memoryRule", {
                          seconds: problem.memorizeSeconds,
                          accuracy: problem.minAccuracy,
                        })
                    : t("dojo.exam.puzzleRule", {
                        moves: playerMoveCount(problem),
                      })
                }
                value={solved ? t("dojo.exam.solved") : undefined}
                accessory="chevron"
                onPress={() => open(kind)}
                testID={`exam-problem-${kind}`}
              />
            );
          })}
        </ListSection>
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
