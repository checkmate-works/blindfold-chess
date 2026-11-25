import { View, Text, StyleSheet, ScrollView } from "react-native";

import { useTheme, fontSize, fontWeight, monoFont } from "../../../theme";

type MoveHistoryProps = {
  title: string;
  /** Squares in visit order, starting square first. */
  moves: readonly string[];
};

/**
 * The visited squares as numbered `N<square>` chips, as on the web: a
 * `text-sm` muted heading, then the chips in a box that stops growing at
 * the web's `max-h-32` and scrolls inside, so a long tour does not push the
 * screen down. Nothing is drawn before the first move is in.
 */
export function MoveHistory({ title, moves }: MoveHistoryProps) {
  const { colors } = useTheme();
  if (moves.length === 0) return null;

  return (
    <View>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>
        {title}
      </Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
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
      </ScrollView>
    </View>
  );
}

/**
 * The web's `mb-3` heading, `max-h-32`, `gap-1` and
 * `px-2 py-1 text-xs font-mono rounded` chips with the number `mr-1`.
 */
const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 128,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  chip: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  number: {
    fontSize: fontSize.xs,
    fontFamily: monoFont,
  },
  square: {
    fontSize: fontSize.xs,
    fontFamily: monoFont,
    fontWeight: fontWeight.bold,
  },
});
