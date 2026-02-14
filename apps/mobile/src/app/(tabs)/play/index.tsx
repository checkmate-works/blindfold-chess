import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Button, Card } from "../../../components";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  shadows,
} from "../../../theme";

export default function PlayTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const handlePlayAi = () => {
    router.push("/(tabs)/play/ai-game/setup");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
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

        <Card style={styles.gameCard} padding="lg">
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {t("aiGame.title")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.mutedForeground }]}
          >
            {t("aiGame.description")}
          </Text>
          <Button
            title={t("aiGame.setup.startGame")}
            onPress={handlePlayAi}
            size="md"
            fullWidth
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  gameCard: {
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
});
