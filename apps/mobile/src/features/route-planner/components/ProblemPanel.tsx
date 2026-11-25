import { useCallback, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  evaluateAttempt,
  type RoutePlannerAttempt,
  type RoutePlannerProblem,
} from "@blindfold-chess/features/route-planner";

import { Button } from "../../../components";
import { useRouteEntry } from "../hooks/useRouteEntry";
import { MovesStrip } from "./MovesStrip";
import { ProblemHeader } from "./ProblemHeader";
import { SquareInput } from "./SquareInput";

type ProblemPanelProps = {
  problem: RoutePlannerProblem | null;
  /** The verdict on the submitted route while it is shown, else null. */
  verdict: boolean | null;
  /** The keys, undo and submit are off (countdown, verdict, server wait). */
  disabled: boolean;
  /** The challenge's countdown, shown in the header's place. */
  countdown?: number | null;
  /** The submitted route, graded, with the goal square appended. */
  onSubmit: (attempt: RoutePlannerAttempt) => void;
  /**
   * Shown under the header in place of the strip and the keypad once the
   * problem is answered (training's feedback and Next Problem).
   */
  feedback?: ReactNode;
};

/**
 * One problem, as the web's session lays it out: the header (piece, start
 * → target), 32 below it the route strip with its undo button, then the
 * keypad and "Submit Answer" — or, once answered, `feedback` in their
 * place. The route lives here, so the parent mounts a
 * new panel (a new `key`) for each problem and it starts empty.
 */
export function ProblemPanel({
  problem,
  verdict,
  disabled,
  countdown = null,
  onSubmit,
  feedback,
}: ProblemPanelProps) {
  const { t } = useTranslation();
  const entry = useRouteEntry({ disabled });
  const { moves, replaceMoves } = entry;
  // The problem is kept out of sight until the countdown is over.
  const shown = countdown === null ? problem : null;

  const submit = useCallback(() => {
    if (!problem || disabled || moves.length === 0) return;
    const attempt = evaluateAttempt(
      problem.piece,
      problem.start,
      moves,
      problem.end,
    );
    // The strip shows the route as graded, goal included.
    replaceMoves(attempt.finalMoves);
    onSubmit(attempt);
  }, [problem, disabled, moves, replaceMoves, onSubmit]);

  return (
    <View style={styles.panel}>
      <ProblemHeader problem={shown} countdown={countdown} />
      {feedback ?? (
        <View style={styles.body}>
          {/* Before the first problem (the countdown) the strip is an empty
            frame and the keypad stays faded, so nothing moves when it
            arrives. */}
          {shown ? (
            <MovesStrip
              start={shown.start}
              end={shown.end}
              moves={moves}
              verdict={verdict}
              onUndo={disabled ? undefined : entry.undo}
            />
          ) : (
            <MovesStrip start={null} end={null} moves={[]} verdict={null} />
          )}
          <View style={styles.input}>
            <SquareInput
              piece={shown?.piece ?? null}
              selectedFile={entry.selectedFile}
              selectedRank={entry.selectedRank}
              disabled={disabled || !shown}
              onFilePress={entry.pressFile}
              onRankPress={entry.pressRank}
            >
              <Button
                title={t("routePlanner.session.submit")}
                icon="flag"
                onPress={submit}
                size="lg"
                fullWidth
                disabled={disabled || moves.length === 0}
                testID="route-submit"
              />
            </SquareInput>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * The web's `pb-4 mb-4` under the header, `space-y-4` between the strip
 * and the keypad, and the keypad's own `p-4` (its rows bleed to the edges
 * on a phone, so only the top padding is left).
 */
const styles = StyleSheet.create({
  panel: {
    gap: 32,
  },
  body: {
    gap: 16,
  },
  input: {
    paddingTop: 16,
  },
});
