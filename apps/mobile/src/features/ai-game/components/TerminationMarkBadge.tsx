import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  HASH_GLYPH_PATHS,
  TERMINATION_MARK_STYLE,
  type TerminationMarkKind,
} from "@blindfold-chess/features/board-display";
import { flagData } from "@blindfold-chess/icons/data";

type TerminationMarkBadgeProps = {
  kind: TerminationMarkKind;
  /** The badge's diameter. */
  size: number;
  /** Accessible name; the caller owns the wording. */
  label?: string;
};

/**
 * The end-of-game badge: `#` on a red disc for a checkmate, a flag on a
 * slate one for a resignation. The board puts it on the losing king's
 * square, and the finished game's result repeats it beside the words, so
 * the two read as one mark.
 *
 * The colours and the stroke paths are the web's own
 * (`TERMINATION_MARK_STYLE`, `HASH_GLYPH_PATHS`, `flagData`), so a game
 * shows the same mark on both.
 */
export function TerminationMarkBadge({
  kind,
  size,
  label,
}: TerminationMarkBadgeProps) {
  const { fill, glyph } = TERMINATION_MARK_STYLE[kind];
  const paths = glyph === "hash" ? HASH_GLYPH_PATHS : flagData.paths;
  const glyphSize = size * 0.72;

  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label !== undefined ? "image" : undefined}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.7)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* The flag is a thinner drawing than the hash (a pole and a waving
          outline), so it takes a heavier stroke to stay legible this
          small, as on the web. */}
      <Svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={glyph === "hash" ? 2.6 : 2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d) => (
          <Path key={d} d={d} />
        ))}
      </Svg>
    </View>
  );
}
