import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { FILES, RANKS } from "@blindfold-chess/types";

import { spacing } from "../theme";
import { CoordinateKeyRow } from "./CoordinateKeyRow";

type CoordinateInputProps = {
  /**
   * The staged file and rank, filled in the primary colour. One of each at
   * most: every mobile keypad stages a single square, so this takes the
   * value itself rather than the web's `Set`.
   */
  selectedFile?: string | null;
  selectedRank?: string | null;
  /**
   * Called with the key pressed. Named for the press, not for a toggle: what
   * a press does (stage it, take it back, append it to an answer) is the
   * module's rule, kept in the module's own state.
   */
  onFilePress?: (file: string) => void;
  onRankPress?: (rank: string) => void;
  /**
   * Which rows to draw. A module that spaces the two rows differently from
   * the pad's 8 (route planner puts them 12 apart, like the rest of its
   * block) draws them as two inputs of one row each, as the web's
   * `PieceCoordinateInput` does.
   */
  showFiles?: boolean;
  showRanks?: boolean;
  /**
   * Turns single keys off, for a module that accepts only some keys at a
   * given step (diagonal quiz takes a file, then a rank). A disabled key
   * fades to 0.3 with a muted label, so the keys still on stand out.
   */
  disabledFile?: (file: string) => boolean;
  disabledRank?: (rank: string) => boolean;
  /**
   * Locks the whole pad: it fades to half and swallows every tap. Unlike
   * `disabledFile` / `disabledRank` the keys keep their own colours, so a
   * staged answer stays readable while the verdict on it is shown.
   */
  disabled?: boolean;
  /** Layout from the caller (width caps, margins); not the keys' look. */
  style?: StyleProp<ViewStyle>;
};

/**
 * The file and rank keypad, the mobile counterpart of the web's
 * `CoordinateInput`: eight keys across in each row, 4 apart, the rows 8
 * apart.
 *
 * @description
 * Every module that takes a square from the player (board symmetry,
 * diagonal quiz, route planner) needs this same pad, and they turn it off
 * in two different ways. One component keeps the two kinds of "off" apart,
 * so a module picks the one it means instead of re-deriving the look,
 * because they tell the player different things:
 *
 * - `disabled` is "not now" for the whole pad (a verdict, a countdown, a
 *   wait for the server). The pad fades as one block, at the web's
 *   `opacity-50`, and the selected keys keep their fill.
 * - `disabledFile` / `disabledRank` are "not this key": the keys that cannot
 *   be pressed at this step take the row's own disabled look and the rest
 *   stay at full strength, which is what tells the player whether a file or
 *   a rank is wanted next.
 *
 * A module whose lock has to cover more than the keys (route planner fades
 * its piece row and submit button with them) dims its own container instead
 * and leaves `disabled` off here; both together would multiply the opacity.
 *
 * What the keys look like (size, radius, colours) lives in
 * `CoordinateKeyRow`, so the touch-target floor is set in one place.
 */
export function CoordinateInput({
  selectedFile = null,
  selectedRank = null,
  onFilePress,
  onRankPress,
  showFiles = true,
  showRanks = true,
  disabledFile,
  disabledRank,
  disabled = false,
  style,
}: CoordinateInputProps) {
  return (
    <View
      style={[styles.container, style, disabled && styles.locked]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {showFiles && (
        <CoordinateKeyRow
          keys={FILES}
          enabled
          activeKey={selectedFile}
          isKeyDisabled={disabledFile}
          onPress={(file) => onFilePress?.(file)}
        />
      )}
      {showRanks && (
        <CoordinateKeyRow
          keys={RANKS}
          enabled
          activeKey={selectedRank}
          isKeyDisabled={disabledRank}
          onPress={(rank) => onRankPress?.(rank)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `flex flex-col gap-2`.
  container: {
    gap: spacing.sm,
  },
  locked: {
    opacity: 0.5,
  },
});
