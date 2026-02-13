import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../../../../components";
import { SettingsForm } from "../../../../features/coordinate-quiz/components";
import { useQuizSettings } from "../../../../features/coordinate-quiz/hooks";
import { useTheme, spacing } from "../../../../theme";

export default function CoordinateQuizSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoading, updateSetting } = useQuizSettings();
  const { colors } = useTheme();

  const handleStartQuiz = () => {
    // Pass settings via global state or URL params
    router.push({
      pathname: "/(tabs)/practice/coordinate-quiz/session",
      params: {
        duration: settings.duration.toString(),
        orientation: settings.orientation,
        feedbackSpeed: settings.feedbackSpeed,
      },
    });
  };

  if (isLoading) {
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
        <SettingsForm settings={settings} onUpdateSetting={updateSetting} />
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
          title={t("coordinateQuiz.setup.startQuiz")}
          onPress={handleStartQuiz}
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
