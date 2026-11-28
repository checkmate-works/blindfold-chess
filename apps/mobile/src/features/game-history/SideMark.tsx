import { StyleSheet, View } from "react-native";

import { useTheme } from "../../theme";

/**
 * The colour the player had, drawn as a stone: a white disc for White, a
 * black one for Black. A word ("White") read as odd in a row whose other
 * facts are short, and the disc is recognised at a glance.
 *
 * Both discs carry an outline in the muted text colour so neither vanishes
 * into the background: the white one on the light theme, the black one on
 * the dark theme. The fills are fixed, not themed, because they name the
 * pieces' colours rather than a surface. The mark says nothing to a screen
 * reader; the row it sits in names the side in its label.
 */
export function SideMark({ side }: { side: "white" | "black" }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.disc,
        {
          backgroundColor: side === "white" ? "#ffffff" : "#000000",
          borderColor: colors.mutedForeground,
        },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    />
  );
}

const styles = StyleSheet.create({
  disc: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
});
