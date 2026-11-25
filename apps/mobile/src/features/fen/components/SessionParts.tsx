import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme, fontSize, spacing, monoFont } from "../../../theme";

/**
 * The parts the FEN drill and position memory stack the same way on their
 * session screens, after the web's `FenRecreate` and
 * `PositionMemoryRecreate`: the problem progress, the FEN box, the clear /
 * flip tools above the board and the muted text links under the submit
 * button.
 */

/** The web's `ProgressBar`: "2 / 5" over a full-width `h-2` track. */
export function ProblemProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
        {current} / {total}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.foreground,
              width: `${(current / total) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

/** The FEN to rebuild, in the web's muted `font-mono text-sm` box; selectable to copy. */
export function FenDisplay({ fen }: { fen: string }) {
  const { colors } = useTheme();
  return (
    <Text
      selectable
      testID="fen-display"
      style={[
        styles.fen,
        {
          color: colors.foreground,
          backgroundColor: colors.muted,
          borderColor: colors.border,
        },
      ]}
    >
      {fen}
    </Text>
  );
}

/**
 * The tool buttons above the recreation board: clear (after a confirmation,
 * and off while the board is empty) and flip, in the web's bordered
 * `p-2 rounded-md text-sm` style. The web's FEN drill has only the flip;
 * the app keeps the clear it always had there too, so both drills offer
 * the same tools.
 */
export function BoardTools({
  boardEmpty,
  onClear,
  onFlip,
}: {
  boardEmpty: boolean;
  onClear: () => void;
  onFlip: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const confirmClear = () =>
    Alert.alert(
      t("fen.session.clearBoardConfirmTitle"),
      t("fen.session.clearBoardConfirmMessage"),
      [
        { text: t("fen.session.clearBoardConfirmNo"), style: "cancel" },
        {
          text: t("fen.session.clearBoardConfirmYes"),
          style: "destructive",
          onPress: onClear,
        },
      ],
    );

  return (
    <View style={styles.tools}>
      <ToolButton
        onPress={confirmClear}
        disabled={boardEmpty}
        accessibilityLabel={t("fen.session.clearBoard")}
        testID="clear-board"
      >
        <MaterialCommunityIcons
          name="eraser"
          size={16}
          color={colors.mutedForeground}
        />
        <Text style={[styles.toolText, { color: colors.mutedForeground }]}>
          {t("fen.session.clearBoard")}
        </Text>
      </ToolButton>
      <ToolButton
        onPress={onFlip}
        accessibilityLabel={t("fen.session.flipBoard")}
        testID="flip-board"
      >
        <Ionicons
          name="swap-vertical"
          size={16}
          color={colors.mutedForeground}
        />
      </ToolButton>
    </View>
  );
}

function ToolButton({
  onPress,
  disabled = false,
  accessibilityLabel,
  testID,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        styles.tool,
        { borderColor: colors.border },
        pressed && { backgroundColor: colors.muted },
        // The web's `disabled:opacity-40`.
        disabled && styles.toolDisabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * The web's muted, underlined text links under the session's main button
 * (view again, skip, quit), centred in a `gap-2` column.
 */
export function SessionLinks({
  links,
}: {
  links: readonly { label: string; onPress: () => void; testID: string }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.links}>
      {links.map((link) => (
        <Pressable
          key={link.testID}
          onPress={link.onPress}
          hitSlop={8}
          accessibilityRole="button"
          testID={link.testID}
        >
          <Text style={[styles.link, { color: colors.mutedForeground }]}>
            {link.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Asks before ending the session early, with the web's wording: the
 * results so far are shown, nothing is thrown away.
 */
export function confirmQuit(
  t: ReturnType<typeof useTranslation>["t"],
  onQuit: () => void,
) {
  Alert.alert(
    t("fen.session.quitConfirmTitle"),
    t("fen.session.quitConfirmMessage"),
    [
      { text: t("fen.session.quitConfirmNo"), style: "cancel" },
      {
        text: t("fen.session.quitConfirmYes"),
        style: "destructive",
        onPress: onQuit,
      },
    ],
  );
}

const styles = StyleSheet.create({
  progressText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  // `px-3 py-2 bg-muted border rounded-md font-mono text-sm`.
  fen: {
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 6,
    fontFamily: monoFont,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  tools: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 6,
  },
  toolDisabled: {
    opacity: 0.4,
  },
  toolText: {
    fontSize: fontSize.sm,
  },
  links: {
    alignItems: "center",
    gap: spacing.sm,
  },
  link: {
    fontSize: fontSize.sm,
    textDecorationLine: "underline",
  },
});
