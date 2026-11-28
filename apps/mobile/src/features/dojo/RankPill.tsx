import { Pressable, StyleSheet, Text, View } from "react-native";
import { BeltIcon } from "@blindfold-chess/icons";
import {
  MUKYU_SLUG,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { borderRadius, fontWeight, useTheme } from "../../theme";
import { beltColors } from "./belt";

/**
 * A rank as a small pill in its belt colour: the belt icon and the rank's
 * name in the belt's `onFill` over its fill, the web's `BeltPill`.
 *
 * @description
 * Mukyu's belt is white, so its pill is the muted fill with grey type and
 * a hairline, the same way `BeltBadge` draws it. With `onPress` the pill is
 * a button; held down it takes the belt's `tint` (and `tintText`), since a
 * control here changes only its fill while pressed.
 */
export function RankPill({
  slug,
  label,
  onPress,
  accessibilityLabel,
}: {
  readonly slug: RankSlug;
  readonly label: string;
  readonly onPress?: () => void;
  /** Read out for a pressable pill: where it leads, not just the name. */
  readonly accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const belt = beltColors(slug, colors);
  const mukyu = slug === MUKYU_SLUG;
  const paint = (pressed: boolean) => ({
    fill: pressed ? belt.tint : mukyu ? colors.muted : belt.fill,
    text: pressed ? belt.tintText : belt.onFill,
  });

  const body = (pressed: boolean) => {
    const { fill, text } = paint(pressed);
    return (
      <View
        style={[
          styles.pill,
          {
            backgroundColor: fill,
            borderColor: mukyu ? colors.panelBorder : fill,
          },
        ]}
      >
        <BeltIcon size={14} color={text} />
        <Text style={[styles.label, { color: text }]}>{label}</Text>
      </View>
    );
  };

  if (onPress === undefined) return body(false);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // The pill is 24pt tall; the slop makes it a 44pt target without
      // pushing the card's title row apart.
      hitSlop={10}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    minHeight: 24,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.bold,
  },
});
