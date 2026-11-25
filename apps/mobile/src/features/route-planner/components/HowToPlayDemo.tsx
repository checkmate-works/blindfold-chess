import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { ChessPieceIcon } from "@blindfold-chess/icons";

import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { fontSize, fontWeight, useTheme, monoFont } from "../../../theme";
import { MovesStrip } from "./MovesStrip";

/** e2 → g3 is one knight move, so the demo's route is the goal alone. */
const DEMO = { start: "e2", end: "g3" } as const;
const ANSWERED_MOVES = [DEMO.end];
const NO_MOVES: readonly string[] = [];

/**
 * The setup screen's demo: the web's picture (a knight, "e2 → g3"), over
 * the session's route strip. Like every module's demo it plays the answer
 * on a loop: the strip takes the route and turns green, the way a correct
 * submission looks in a run.
 */
export function HowToPlayDemo() {
  const { colors } = useTheme();
  const answered = useDemoAnswerLoop();

  return (
    <View style={styles.container}>
      <View style={styles.problem}>
        <ChessPieceIcon type="n" color="w" size={36} />
        <Text style={[styles.square, { color: colors.foreground }]}>
          {DEMO.start}
        </Text>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={colors.mutedForeground}
        />
        <Text style={[styles.square, { color: colors.foreground }]}>
          {DEMO.end}
        </Text>
      </View>
      <MovesStrip
        start={DEMO.start}
        end={DEMO.end}
        moves={answered ? ANSWERED_MOVES : NO_MOVES}
        verdict={answered ? true : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: 16,
  },
  // The web's `flex items-center justify-center gap-3`.
  problem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  // The web's `text-lg font-bold`.
  square: {
    fontFamily: monoFont,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
