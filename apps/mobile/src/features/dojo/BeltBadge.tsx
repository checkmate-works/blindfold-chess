import { StyleSheet, View } from "react-native";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { useTheme } from "../../theme";
import { beltColors } from "./belt";

/**
 * A rank's belt as a round swatch, outlined so the white (mukyu) and the
 * near-black (1dan) belts stay visible on either theme.
 */
export function BeltBadge({
  slug,
  size = 28,
}: {
  readonly slug: RankSlug;
  readonly size?: number;
}) {
  const { colors } = useTheme();
  const belt = beltColors(slug, colors);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: belt.fill,
          borderColor: belt.outline,
        },
      ]}
    >
      {/* The knot of the belt: a band across the middle in the text colour. */}
      <View
        style={[
          styles.band,
          { height: Math.max(3, size / 7), backgroundColor: belt.onFill },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  band: {
    alignSelf: "stretch",
    opacity: 0.35,
  },
});
