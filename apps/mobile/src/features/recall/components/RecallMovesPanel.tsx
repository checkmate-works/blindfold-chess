import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatMovesToPgn } from "@blindfold-chess/features/chess-core/pgn-format";
import type { Side } from "@blindfold-chess/types";

import {
  borderRadius,
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
  withAlpha,
} from "../../../theme";

/**
 * The web's `RecallMovesPanel`: a bordered panel headed "Moves" with the
 * moves entered so far in numbered White / Black rows, the latest one
 * marked. It grows with the page instead of scrolling inside it. The web's
 * move browsing, Lichess and copy buttons are not ported.
 */
export function RecallMovesPanel({
  moves,
  firstMover,
  startMoveNumber,
}: {
  moves: readonly string[];
  firstMover: Side;
  startMoveNumber: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rows = formatMovesToPgn(moves, firstMover === "black", startMoveNumber);
  const last = moves.length - 1;

  const cell = (move: string | undefined, index: number | undefined) => (
    <Text
      style={[
        styles.move,
        { color: colors.foreground },
        index === last && { backgroundColor: colors.accent },
      ]}
    >
      {move ?? ""}
    </Text>
  );

  return (
    <View style={[styles.panel, { borderColor: colors.border }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: withAlpha(colors.muted, 0.3) },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("recall.moves")}
        </Text>
      </View>
      <View style={styles.body}>
        {rows.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            {t("aiGame.session.noMoves")}
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.moveNumber} style={styles.row}>
              <Text style={[styles.number, { color: colors.mutedForeground }]}>
                {row.moveNumber}.
              </Text>
              {row.whiteMove === undefined ? (
                <Text style={[styles.move, { color: colors.mutedForeground }]}>
                  …
                </Text>
              ) : (
                cell(row.whiteMove, row.whiteMoveIndex)
              )}
              {cell(row.blackMove, row.blackMoveIndex)}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  // `px-4 py-3 bg-muted/30`, `font-medium`.
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  body: {
    padding: spacing.md,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  number: {
    width: 36,
    textAlign: "right",
    fontFamily: monoFont,
    fontSize: fontSize.sm,
  },
  move: {
    flex: 1,
    fontFamily: monoFont,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  empty: {
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
});
