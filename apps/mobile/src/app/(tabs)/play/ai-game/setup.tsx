import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "../../../../components";
import { SettingsForm } from "../../../../features/ai-game/components";
import { useGameSettings } from "../../../../features/ai-game/hooks";
import { useTheme, spacing } from "../../../../theme";

export default function AiGameSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useGameSettings();
  const { colors } = useTheme();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/play/ai-game/session",
      params: {
        playerColor: settings.playerColor,
        skillLevel: settings.skillLevel.toString(),
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
          playerColor={settings.playerColor}
          skillLevel={settings.skillLevel}
          onUpdatePlayerColor={(playerColor) => updateSettings({ playerColor })}
          onUpdateSkillLevel={(skillLevel) => updateSettings({ skillLevel })}
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
          title={t("aiGame.setup.startGame")}
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
