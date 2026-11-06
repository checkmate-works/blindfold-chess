import { View, Text, StyleSheet } from "react-native";

import {
  useTheme,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
} from "../../../theme";

type MoveHistoryProps = {
  title: string;
  /** Squares in visit order, starting square first. */
  moves: readonly string[];
};

/** The visited squares as numbered `N<square>` chips, as on the web. */
export function MoveHistory({ title, moves }: MoveHistoryProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>
        {title}
      </Text>
      <View style={styles.list}>
        {moves.map((square, index) => (
          <View
            key={square}
            style={[styles.chip, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.number, { color: colors.mutedForeground }]}>
              {index + 1}.
            </Text>
            <Text style={[styles.square, { color: colors.foreground }]}>
              N{square}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  number: {
    fontSize: fontSize.xs,
  },
  square: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
