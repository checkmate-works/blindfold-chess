import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
 * The share of the screen the sheet's body may take before it scrolls. Every
 * bundled definition fits well inside it at the default text size; only the
 * largest accessibility sizes reach it.
 */
const BODY_MAX_HEIGHT_RATIO = 0.6;

/**
 * One glossary term, shown as a sheet over the screen it was opened from
 * (the root stack presents `glossary/[slug]` as a `formSheet` sized to its
 * content, dragged down to close). A form sheet has no navigation bar on
 * Android, so the sheet draws its own title row and ×. Related terms
 * replace the sheet's content in place.
 *
 * @description
 * The sheet is as tall as the term, so a one-line definition does not sit
 * in half a screen of white. Sized to its content, the screen is laid out
 * without a height to fill, so nothing here may lean on `flex: 1`: the body
 * is a `ScrollView` that takes its content's height up to
 * `BODY_MAX_HEIGHT_RATIO` of the screen and scrolls beyond it. The root is
 * `collapsable={false}`: react-native-screens looks for a `ScrollView` among
 * the sheet's direct children and resizes and moves it to fill the sheet,
 * and once the root was flattened away it found the body and drew it over
 * the title. Kept as a real view, the root is what it finds. The category
 * sits over the name as a quiet label, grey rather than the link blue, since
 * it is not tappable.
 */
export default function GlossaryTermSheet() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const term = GLOSSARY_TERMS.find((entry) => entry.slug === slug);

  if (!term) return null;
  const { name, definition } = termText(term, i18n.language);
  const related = term.relatedTerms
    .map((s) => GLOSSARY_TERMS.find((entry) => entry.slug === s))
    .filter((entry) => entry !== undefined);

  return (
    <View
      collapsable={false}
      style={[styles.root, { backgroundColor: colors.card }]}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          {/* glossary.categories.<category> */}
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {t(`glossary.categories.${term.category}`)}
          </Text>
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
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          testID="sheet-close"
          style={styles.closeTarget}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.close,
                { backgroundColor: pressed ? colors.border : colors.muted },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </View>
          )}
        </Pressable>
      </View>
      <ScrollView
        style={[
          styles.bodyScroll,
          { maxHeight: windowHeight * BODY_MAX_HEIGHT_RATIO },
        ]}
        contentContainerStyle={styles.body}
      >
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
    // The OS draws the grabber; the title row sits under it.
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  // A 44pt square to touch, with the 30pt circle drawn inside it.
  closeTarget: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    flexGrow: 0,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
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
