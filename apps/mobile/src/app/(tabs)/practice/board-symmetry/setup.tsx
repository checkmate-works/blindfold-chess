import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../../../../components";
import { SettingsForm } from "../../../../features/board-symmetry/components";
import { useBoardSymmetrySettings } from "../../../../features/board-symmetry/hooks";
import { useTheme, spacing } from "../../../../theme";

export default function BoardSymmetrySetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useBoardSymmetrySettings();
  const { colors } = useTheme();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/board-symmetry/session",
      params: {
        timeLimit: settings.timeLimit.toString(),
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
          timeLimit={settings.timeLimit}
          onUpdateTimeLimit={(timeLimit) => updateSettings({ timeLimit })}
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
          title={t("boardSymmetry.setup.startQuiz")}
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
