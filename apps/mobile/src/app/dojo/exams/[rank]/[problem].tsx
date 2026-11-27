import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core";
import { DOJO_EXAMS } from "@blindfold-chess/features/dojo-journey";
import {
  isRankSlug,
  type ExamProblemKind,
} from "@blindfold-chess/features/dojo-ranks";

import { BottomBar, Button, ListSection, Screen } from "../../../../components";
import { examProblemSegment } from "../../../../features/dojo/dojo-api";
import { ExamPatternList } from "../../../../features/dojo/ExamPatternList";
import { BoardAccordion } from "../../../../features/puzzle/components/BoardAccordion";
import { PiecesInfo } from "../../../../features/puzzle/components/PiecesInfo";
import { fontSize, spacing, useTheme } from "../../../../theme";

const KINDS: readonly ExamProblemKind[] = ["position_memory", "puzzle"];

/**
 * Dojo exam problem (道場の課題の問題)
 *
 * @description
 * One problem of a rank's exam before it starts, laid out like a puzzle's
 * page (`practice/puzzle/[id]`) and like the web's exam problem page: what
 * the rank's problem practises, the pieces as text, the board behind "Show
 * Board", the patterns useful for solving (constants of the exam, closed at
 * first), and Start in the footer. Start opens the problem's session with
 * the `exam` param, as the exam's list used to directly, so the memorize
 * clock or the puzzle does not begin the moment the row is pressed.
 *
 * @flow
 * 1. Opened from a problem row of `dojo/exams/[rank]`
 * 2. Start → the session → its result, which grades the answer
 * 3. Closing the result returns here
 */
export default function DojoExamProblemScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ rank: string; problem: string }>();
  const rank =
    isRankSlug(params.rank) && params.rank !== "mukyu"
      ? params.rank
      : undefined;
  const kind = KINDS.find((k) => examProblemSegment(k) === params.problem);
  const problem = rank && kind ? DOJO_EXAMS[rank]?.[kind] : undefined;
  if (!rank || !kind || !problem) return null;

  const rankName = t(`ranks.names.${rank}`);
  const isMemory = problem.kind === "position_memory";

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          // ranks.requirement.examProblemNames.position_memory / .puzzle
          title: t(`ranks.requirement.examProblemNames.${kind}`),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ListSection
          title={t(
            isMemory
              ? "dojo.exam.memoryDescriptionSection"
              : "dojo.exam.puzzleDescriptionSection",
          )}
        >
          <Text style={[styles.description, { color: colors.foreground }]}>
            {/* dojo.exam.memoryIntro.<rank> / dojo.exam.puzzleIntro.<rank>:
                each rank with an exam (2kyu) */}
            {t(
              `dojo.exam.${isMemory ? "memoryIntro" : "puzzleIntro"}.${rank}`,
              { rank: rankName },
            )}
          </Text>
        </ListSection>
        <PiecesInfo fen={problem.fen} showSideToMove={!isMemory} />
        <BoardAccordion
          fen={problem.fen}
          flipped={!isMemory && isBlackToMoveFromFen(problem.fen)}
          maxSize={width - BOARD_INSET}
          testID="exam-problem-board"
        />
        <ExamPatternList patterns={problem.patterns} />
      </ScrollView>
      <BottomBar>
        <Button
          title={t("dojo.exam.attempt")}
          icon="play"
          size="lg"
          fullWidth
          testID="exam-problem-start"
          onPress={() =>
            router.push({
              pathname: isMemory
                ? "/practice/position-memory/session"
                : "/practice/puzzle/session",
              params: { exam: rank },
            })
          }
        />
      </BottomBar>
    </Screen>
  );
}

/** The page's padding on both sides and the accordion's border. */
const BOARD_INSET = spacing.md * 2 + 2;

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
    padding: spacing.md,
  },
});
