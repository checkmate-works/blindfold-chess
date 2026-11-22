import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { GLOSSARY_TERMS } from "../../features/glossary/generated/terms";
import { termText } from "../../features/glossary/types";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../theme";

/**
 * One glossary term, shown as a sheet over the screen it was opened from
 * (the root stack presents `glossary/[slug]` as a `formSheet`: half height,
 * drag up for full, drag down to close). A form sheet has no navigation bar
 * on Android, so the sheet draws its own title row and ×. Related terms
 * replace the sheet's content in place.
 */
export default function GlossaryTermSheet() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const term = GLOSSARY_TERMS.find((entry) => entry.slug === slug);

  if (!term) return null;
  const { name, definition } = termText(term, i18n.language);
  const related = term.relatedTerms
    .map((s) => GLOSSARY_TERMS.find((entry) => entry.slug === s))
    .filter((entry) => entry !== undefined);

  return (
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.foreground }]}
          >
            {name}
          </Text>
          {name !== term.term && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {term.term}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          testID="sheet-close"
          style={[styles.close, { backgroundColor: colors.muted }]}
        >
          <Ionicons name="close" size={18} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {/* glossary.categories.<category> */}
        <Text style={[styles.category, { color: colors.primary }]}>
          {t(`glossary.categories.${term.category}`)}
        </Text>
        <Text style={[styles.definition, { color: colors.foreground }]}>
          {definition}
        </Text>
        {term.aliases.length > 0 && (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {t("glossary.aliases")}: {term.aliases.join(", ")}
          </Text>
        )}
        {related.length > 0 && (
          <View style={styles.related}>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t("glossary.relatedTerms")}
            </Text>
            <View style={styles.chips}>
              {related.map((entry) => (
                <Pressable
                  key={entry.slug}
                  onPress={() =>
                    router.replace(`/glossary/${entry.slug}` as Href)
                  }
                  style={[styles.chip, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.primary }}>
                    {termText(entry, i18n.language).name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  category: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  definition: {
    fontSize: fontSize.md,
    lineHeight: 26,
  },
  meta: {
    fontSize: fontSize.sm,
  },
  related: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
});
