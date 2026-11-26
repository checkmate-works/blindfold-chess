import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { replayMoves } from "@blindfold-chess/features/chess-core";
import { fenToPlacements } from "@blindfold-chess/features/chess-core/fen";
import { moveLineSans } from "@blindfold-chess/features/dojo-guides";

import {
  borderRadius,
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
} from "../../../theme";
import { GuideBoard } from "./GuideBoard";

/**
 * A move line the reader can step through: the web renders the guide's line
 * as a move reference that opens a steppable board preview. Here the moves
 * stand in the text with arrows either side; tapping a move or stepping
 * opens the board under them at that position, with the last move ringed as
 * the web's preview highlights it. The board stays closed at the start
 * because the guide has just drawn the starting position above the line.
 */
export function MoveLineReplay({ fen, line }: { fen: string; line: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sans = useMemo(() => moveLineSans(line), [line]);
  // A replay stops at the first illegal move; the shared package's test pins
  // the guide's line as legal, so the positions cover every move.
  const positions = useMemo(() => replayMoves(sans, fen), [sans, fen]);
  const [ply, setPly] = useState(0);
  const position = positions[ply] ?? positions[0];
  const last = position.lastMove;
  const firstMoveNumber = Number(line.match(/^\s*(\d+)\./)?.[1] ?? 1);

  const step = (delta: number) =>
    setPly((p) => Math.min(Math.max(p + delta, 0), positions.length - 1));

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <StepButton
          icon="chevron-back"
          label={t("common.previous")}
          disabled={ply === 0}
          onPress={() => step(-1)}
        />
        <View style={styles.moves}>
          {sans.slice(0, positions.length - 1).map((san, i) => {
            const selected = ply === i + 1;
            return (
              <View key={i} style={styles.moveGroup}>
                {i % 2 === 0 && (
                  <Text
                    style={[
                      styles.moveNumber,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {firstMoveNumber + i / 2}.
                  </Text>
                )}
                <Pressable
                  onPress={() => setPly(i + 1)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.move,
                    selected && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.moveText,
                      {
                        color: selected
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {san}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <StepButton
          icon="chevron-forward"
          label={t("common.next")}
          disabled={ply === positions.length - 1}
          onPress={() => step(1)}
        />
      </View>
      {ply > 0 && (
        <GuideBoard
          pieces={fenToPlacements(position.fen)}
          ringed={last ? [last.from, last.to] : []}
        />
      )}
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: "chevron-back" | "chevron-forward";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.stepButton, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={22} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  moves: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: spacing.xs,
  },
  moveGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  moveNumber: {
    fontSize: fontSize.sm,
    fontFamily: monoFont,
    marginLeft: spacing.xs,
  },
  move: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  moveText: {
    fontSize: fontSize.sm,
    fontFamily: monoFont,
    fontWeight: fontWeight.medium,
  },
  stepButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.3,
  },
});
