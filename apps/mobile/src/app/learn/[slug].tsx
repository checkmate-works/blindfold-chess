import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { Screen } from "../../components";
import { MarkdownView } from "../../features/learn/MarkdownView";
import { LEARN_ARTICLES } from "../../features/learn/generated/articles";
import { localized } from "../../features/learn/types";
import { useTheme, fontSize, fontWeight, spacing } from "../../theme";

/** One learn article (the web's `/learn/<category>/<slug>`). */
export default function LearnArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const article = LEARN_ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return <Screen edges={["bottom"]}>{null}</Screen>;
  }

  const title = localized(article.title, i18n.language);
  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        <MarkdownView source={localized(article.body, i18n.language)} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
});
