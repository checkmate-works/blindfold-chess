import { StyleSheet, Text, View } from "react-native";
import type { DiagonalPair } from "@blindfold-chess/features/dojo-guides";

import {
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
  withAlpha,
} from "../../../theme";
import { GUIDE_COLORS } from "./GuideBoard";

/**
 * The web's diagonal pattern table: a caption over start → end rows. With
 * `highlightFirst` the first row — the long diagonal the others shorten
 * from — is tinted, as the web tints it emerald.
 */
export function PatternTable({
  title,
  startHeader,
  endHeader,
  pairs,
  highlightFirst = false,
}: {
  title: string;
  startHeader: string;
  endHeader: string;
  pairs: readonly DiagonalPair[];
  highlightFirst?: boolean;
}) {
  const { colors } = useTheme();
  const cell = [styles.cell, { color: colors.foreground }];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <View
        style={[styles.row, styles.headerRow, { borderColor: colors.border }]}
      >
        <Text style={[styles.header, { color: colors.mutedForeground }]}>
          {startHeader}
        </Text>
        <Text style={styles.arrow} />
        <Text style={[styles.header, { color: colors.mutedForeground }]}>
          {endHeader}
        </Text>
      </View>
      {pairs.map((pair, i) => (
        <View
          key={pair.start}
          style={[
            styles.row,
            { borderColor: withAlpha(colors.border, 0.5) },
            highlightFirst &&
              i === 0 && {
                backgroundColor: withAlpha(GUIDE_COLORS.emerald, 0.12),
              },
          ]}
        >
          <Text style={cell}>{pair.start}</Text>
          <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
            →
          </Text>
          <Text style={cell}>{pair.end}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `max-w-xs`, centred in the column.
  container: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  header: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  cell: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: monoFont,
  },
  arrow: {
    width: 32,
    fontSize: fontSize.sm,
  },
});
