import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SIDES, type Side } from "@blindfold-chess/types";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";

/**
 * The web's `ColorSelector` (from its new-game form): one segmented control,
 * "○ Play as White" | "● Play as Black", on the secondary surface with the
 * chosen side raised on the card colour.
 */
export function ColorSelector({
  value,
  onChange,
}: {
  value: Side;
  onChange: (side: Side) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[styles.track, { backgroundColor: colors.secondary }]}
      accessibilityRole="tablist"
    >
      {SIDES.map((side) => {
        const selected = side === value;
        return (
          <Pressable
            key={side}
            onPress={() => onChange(side)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.card },
            ]}
            testID={`recall-color-${side}`}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.foreground : colors.mutedForeground,
                },
              ]}
            >
              {side === "white" ? "○ " : "● "}
              {/* recall.setup.color.white, recall.setup.color.black */}
              {t(`recall.setup.color.${side}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // `rounded-lg bg-secondary p-1`, segments `rounded-md px-4 py-2 text-sm`.
  track: {
    flexDirection: "row",
    borderRadius: 8,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
