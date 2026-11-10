import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Card, Screen } from "../../../components";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
} from "../../../theme";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../../../navigation/practice-modules";

export default function PracticeIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen edges={["top"]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("practice.title")}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* `practice.${i18nKey}.title` / `.description` (i18nKey from MOBILE_PRACTICE_MODULES): practice.coordinateQuiz.title, practice.legalMoves.title, practice.boardSymmetry.title, practice.squareColors.title, practice.diagonalQuiz.title, practice.routePlanner.title, practice.quadrants.title, practice.knightTour.title, practice.algebraicNotation.title, practice.fen.title, and the same ten with .description */}
        {MOBILE_PRACTICE_MODULES.map((item) => (
          <TouchableOpacity
            key={item.slug}
            onPress={() =>
              router.push(
                `/(tabs)/practice/${practiceModuleRoute(item)}/setup` as never,
              )
            }
            activeOpacity={0.7}
          >
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text
                    style={[styles.cardTitle, { color: colors.foreground }]}
                  >
                    {t(`practice.${item.i18nKey}.title`)}
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t(`practice.${item.i18nKey}.description`)}
                  </Text>
                </View>
                <Text
                  style={[styles.chevron, { color: colors.mutedForeground }]}
                >
                  ›
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    ...shadows.sm,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
  },
  chevron: {
    fontSize: 24,
    marginLeft: spacing.sm,
  },
});
