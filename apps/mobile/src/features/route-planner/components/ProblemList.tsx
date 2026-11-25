import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { RoutePlannerProblemResult } from "@blindfold-chess/features/route-planner";

import {
  PROBLEM_DETAILS_INSET,
  ProblemDetailsList,
  problemVerdict,
} from "../../../components";
import {
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
} from "../../../theme";
import { ProblemFeedback } from "./ProblemFeedback";

/**
 * The web result's "Problem Details": each problem's row shows the piece and
 * start → target, and opens onto the same feedback as training's. The row,
 * the verdict and which rows start open are `ProblemDetailsList`'s.
 */
export function ProblemList({
  problems,
}: {
  problems: readonly RoutePlannerProblemResult[];
}) {
  return (
    <ProblemDetailsList
      problems={problems}
      verdictOf={(problem) =>
        problemVerdict({
          correct: problem.success,
          skipped: problem.skipped,
          timedOut: problem.timedOut,
        })
      }
      renderSubtitle={(problem) => <RouteLabel problem={problem} />}
      renderDetails={(problem) => (
        <ProblemFeedback
          piece={problem.piece}
          start={problem.start}
          end={problem.end}
          moves={problem.userPath}
          shortestPath={problem.shortestPath}
          success={problem.success}
          // A timed-out problem has no route of the player's either.
          skipped={problem.skipped || problem.timedOut}
          boardInset={spacing.lg * 2 + PROBLEM_DETAILS_INSET}
        />
      )}
      rowTestIDPrefix="route-result-row-"
    />
  );
}

function RouteLabel({ problem }: { problem: RoutePlannerProblemResult }) {
  const { colors } = useTheme();
  return (
    <View style={styles.route}>
      <ChessPieceIcon type={problem.piece} color="w" size={20} />
      <View style={styles.squares}>
        <Text style={[styles.square, { color: colors.foreground }]}>
          {problem.start}
        </Text>
        <Ionicons
          name="arrow-forward"
          size={10}
          color={colors.mutedForeground}
        />
        <Text style={[styles.square, { color: colors.foreground }]}>
          {problem.end}
        </Text>
      </View>
    </View>
  );
}

/** The web's piece, then `font-mono font-bold` squares with a `gap-2` arrow. */
const styles = StyleSheet.create({
  route: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  squares: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  square: {
    fontFamily: monoFont,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
