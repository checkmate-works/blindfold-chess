import { View, StyleSheet } from "react-native";
import { Heart } from "lucide-react-native";

import { useTheme, spacing } from "../theme";

type LivesIndicatorProps = {
  /** Mistakes still allowed before the run ends. */
  remaining: number;
  /** The mistake limit: how many hearts the row shows in all. */
  max: number;
};

/**
 * One heart per allowed mistake, filled while it is still available and
 * faded once spent: the web's lives row in `ChallengeStatusHeader` (filled
 * `FaHeart`, `FaRegHeart` at 30% opacity, both in the destructive colour).
 */
export function LivesIndicator({ remaining, max }: LivesIndicatorProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => {
        const alive = i < remaining;
        return (
          <Heart
            key={i}
            size={20}
            color={colors.destructive}
            fill={alive ? colors.destructive : "transparent"}
            opacity={alive ? 1 : 0.3}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
