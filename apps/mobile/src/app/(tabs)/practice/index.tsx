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

type PracticeItem = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  route: string;
};

export default function PracticeIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const practiceItems: PracticeItem[] = [
    {
      id: "coordinate-quiz",
      titleKey: "practice.coordinateQuiz.title",
      descriptionKey: "practice.coordinateQuiz.description",
      icon: "♟",
      route: "/(tabs)/practice/coordinate-quiz/setup",
    },
    {
      id: "legal-moves",
      titleKey: "practice.legalMoves.title",
      descriptionKey: "practice.legalMoves.description",
      icon: "♞",
      route: "/(tabs)/practice/legal-moves/setup",
    },
    {
      id: "board-symmetry",
      titleKey: "practice.boardSymmetry.title",
      descriptionKey: "practice.boardSymmetry.description",
      icon: "🦋",
      route: "/(tabs)/practice/board-symmetry/setup",
    },
    {
      id: "square-colors",
      titleKey: "practice.squareColors.title",
      descriptionKey: "practice.squareColors.description",
      icon: "🎨",
      route: "/(tabs)/practice/square-colors/setup",
    },
    {
      id: "diagonal-quiz",
      titleKey: "practice.diagonalQuiz.title",
      descriptionKey: "practice.diagonalQuiz.description",
      icon: "\u2197",
      route: "/(tabs)/practice/diagonal-quiz/setup",
    },
    {
      id: "route-planner",
      titleKey: "practice.routePlanner.title",
      descriptionKey: "practice.routePlanner.description",
      icon: "\u265E",
      route: "/(tabs)/practice/route-planner/setup",
    },
  ];

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
        {practiceItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push(item.route as never)}
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
                    {t(item.titleKey)}
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t(item.descriptionKey)}
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
