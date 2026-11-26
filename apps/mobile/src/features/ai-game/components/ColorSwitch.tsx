import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import { SIDES, type Side } from "@blindfold-chess/types";

import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";

type Props = {
  value: Side;
  onChange: (side: Side) => void;
};

const PIECE_COLOR = { white: "w", black: "b" } as const;

/**
 * The side the player takes, as the web's two-way switch: a sunken track
 * with the chosen half raised. Each half carries a king of its colour, so
 * the choice reads without the label.
 *
 * A switch rather than a row that opens a sheet because there are only ever
 * two answers and both fit on screen.
 */
export function ColorSwitch({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("aiGame.setup.playerColor")}
      style={[styles.track, { backgroundColor: colors.muted }]}
    >
      {SIDES.map((side) => {
        const selected = side === value;
        return (
          <Pressable
            key={side}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(side)}
            testID={`color-switch-${side}`}
            style={[
              styles.half,
              selected && {
                backgroundColor: colors.card,
                borderColor: colors.panelBorder,
              },
            ]}
          >
            <ChessPieceIcon type="k" color={PIECE_COLOR[side]} size={24} />
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.foreground : colors.mutedForeground,
                },
              ]}
            >
              {/* aiGame.setup.<Side>: aiGame.setup.white, aiGame.setup.black */}
              {t(`aiGame.setup.${side}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  half: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: touchTarget.minSize,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
