import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Screen } from "../../../components";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";

export default function PlayTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const handlePlayAi = () => {
    router.push("/(tabs)/play/ai-game/setup");
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("tabs.play")}
          </Text>
        </View>

        <AiGameCard
          buttonTitle={t("aiGame.setup.startGame")}
          onPress={handlePlayAi}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
});
