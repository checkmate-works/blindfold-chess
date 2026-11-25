import { StyleSheet, Text, View } from "react-native";

import { spacing } from "../theme";

type BoardCountdownProps = {
  /**
   * Seconds left before the timed session starts, or null once it has (and
   * always in training). Null draws nothing.
   */
  countdown: number | null;
  /**
   * The corner radius of the board underneath. The scrim is laid over the
   * board's frame from outside it, so the board's own clipping does not
   * reach it, and a scrim with square corners shows past a rounded board.
   */
  borderRadius?: number;
};

/**
 * The pre-session count ("3, 2, 1, START!") laid over the board of a
 * module whose countdown stands inside the body (`countdownInBody`) rather
 * than covering the screen. Place it as a sibling after the board, in a
 * wrapper the board fills, so the scrim covers exactly the board.
 *
 * The web veils the board with 30% black plus a backdrop blur. React Native
 * has no blur without another native module, and 30% alone leaves the
 * squares at full contrast, so the scrim is 55%. The scrim also takes the
 * touches, though the module locks its board for the countdown anyway.
 *
 * The number is 96pt white. "START!" at that size is wider than a phone's
 * board, so the text shrinks to one line instead of breaking.
 */
export function BoardCountdown({
  countdown,
  borderRadius = 0,
}: BoardCountdownProps) {
  if (countdown === null) return null;

  return (
    <View
      style={[styles.scrim, { borderRadius }]}
      testID="countdown-overlay"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text} numberOfLines={1} adjustsFontSizeToFit>
        {countdown > 0 ? countdown : "START!"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    // Above anything the module lays over its own board (coordinate quiz's
    // target name sits at 10).
    zIndex: 20,
  },
  text: {
    color: "#ffffff",
    fontSize: 96,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    elevation: 5,
  },
});
