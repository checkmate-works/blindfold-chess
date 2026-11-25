import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { ChessBoard } from "../../ai-game/components";
import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../../theme";

/**
 * The web's "Show Board" accordion for a puzzle: closed by default, and
 * opening it draws the whole position — every piece, whatever the
 * blindfold board preferences say — facing the side to move. `onOpen` runs
 * on each opening, which the session counts as a peek.
 */
export function BoardAccordion({
  fen,
  flipped,
  lastMove = null,
  onOpen,
  maxSize,
  testID,
}: {
  fen: string;
  flipped: boolean;
  lastMove?: { from: string; to: string } | null;
  onOpen?: () => void;
  /** Caps the board's width (see `ChessBoard`'s `maxSize`). */
  maxSize?: number;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.frame, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={testID}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: colors.card },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("puzzle.session.showBoard")}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open && (
        <View style={styles.body}>
          <ChessBoard
            fen={fen}
            flipped={flipped}
            lastMove={lastMove}
            maxSize={maxSize}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  body: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
});
