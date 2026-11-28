import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../../theme";
import { beltColors } from "./belt";

const DOT_SIZE = 12;

/**
 * A small circle in a rank's belt colour, in a row's leading slot where a
 * `ListIcon` would otherwise sit: the web's guide index marks each guide
 * with the same dot.
 *
 * @description
 * The dot stands in a box the size of a `ListIcon` (32pt), so a list that
 * mixes dot rows and icon rows keeps its titles on one line. Every dot has
 * the belt's outline, since the unranked belt is white and would vanish on
 * a light panel without it, and an outline on that one alone made it look
 * like a different kind of mark.
 */
export function BeltDot({ slug }: { slug: RankSlug }) {
  const { colors } = useTheme();
  const belt = beltColors(slug, colors);
  return (
    <View style={styles.box} importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.dot,
          { backgroundColor: belt.fill, borderColor: belt.outline },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
