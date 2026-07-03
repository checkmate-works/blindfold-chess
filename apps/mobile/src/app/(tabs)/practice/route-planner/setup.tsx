import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../../../../components";
import { SettingsForm } from "../../../../features/route-planner/components";
import { useRoutePlannerSettings } from "../../../../features/route-planner/hooks";
import { useTheme, spacing } from "../../../../theme";

export default function RoutePlannerSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings, togglePiece } =
    useRoutePlannerSettings();
  const { colors } = useTheme();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/route-planner/session",
      params: {
        problemCount: settings.problemCount.toString(),
        pieces: settings.selectedPieces.join(""),
      },
    });
  };

  if (!isLoaded) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SettingsForm
          problemCount={settings.problemCount}
          selectedPieces={settings.selectedPieces}
          onUpdateProblemCount={(problemCount) =>
            updateSettings({ problemCount })
          }
          onTogglePiece={togglePiece}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Button
          title={t("routePlanner.setup.start")}
          onPress={handleStart}
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
