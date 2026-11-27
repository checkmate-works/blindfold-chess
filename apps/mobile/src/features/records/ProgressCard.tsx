import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../auth/use-auth";
import { useTheme, borderRadius, fontWeight, spacing } from "../../theme";
import { AccountStats } from "./AccountStats";

/**
 * The signed-in player's progress on the home tab — username, then dojo
 * rank, level and EXP (`AccountStats`, shared with mypage's heading). Taps
 * through to their records. Renders nothing signed out or before the
 * account has loaded.
 *
 * A flat surface on the white page: a 1px `panelBorder` frame rather than a
 * hairline, which some devices render too faint to see on white, and no
 * shadow. Pressing changes only the fill (to `muted`), not the position or
 * opacity, like every other pressable surface.
 */
export function ProgressCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, account } = useAuth();
  if (status !== "signedIn" || !account) return null;

  return (
    <Pressable
      onPress={() => router.push("/records")}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.muted : colors.card,
          borderColor: colors.panelBorder,
        },
      ]}
    >
      <Text style={[styles.name, { color: colors.foreground }]}>
        {account.username ?? account.email ?? ""}
      </Text>
      <AccountStats account={account} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
});
