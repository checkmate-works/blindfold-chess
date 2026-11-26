import { StyleSheet, View } from "react-native";
import { BeltIcon } from "@blindfold-chess/icons";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { useTheme } from "../../theme";
import { beltColors } from "./belt";

/**
 * A rank's badge: a circle painted in the belt colour with the belt icon
 * on it in white (the web's `BeltStrip`). Mukyu has no colour yet, so it is
 * a muted circle with a grey icon. A 1px `panelBorder` outline (the same frame the app's panels wear) keeps the near-black
 * 1dan circle visible on the dark theme.
 */
export function BeltBadge({
  slug,
  size = 32,
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
          backgroundColor: slug === "mukyu" ? colors.muted : belt.fill,
          borderColor: colors.panelBorder,
        },
      ]}
    >
      <BeltIcon size={Math.round(size * 0.58)} color={belt.onFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
