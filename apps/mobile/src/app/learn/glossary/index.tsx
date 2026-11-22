import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection, Screen } from "../../../components";
import { GLOSSARY_TERMS } from "../../../features/glossary/generated/terms";
import {
  GLOSSARY_CATEGORIES,
  termText,
} from "../../../features/glossary/types";
import { useTheme, borderRadius, fontSize, spacing } from "../../../theme";

/**
 * The chess glossary (the web's `/glossary`): every term grouped by
 * category, with a search over names, aliases and definitions. A term opens
 * in a sheet (`glossary/[slug]`), so the list keeps its place.
 */
export default function GlossaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter((term) =>
      [
        term.term,
        term.termJa,
        ...term.aliases,
        term.definitionJa,
        term.definitionEn,
      ].some((text) => text.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <Screen edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("glossary.search")}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[
            styles.search,
            { color: colors.foreground, backgroundColor: colors.muted },
          ]}
        />
        {/* glossary.categories.{tactics,strategy,endgame,opening,structure,general,principle} */}
        {GLOSSARY_CATEGORIES.map((category) => {
          const terms = matches.filter((term) => term.category === category);
          if (terms.length === 0) return null;
          return (
            <ListSection
              key={category}
              title={t(`glossary.categories.${category}`)}
            >
              {terms.map((term) => {
                const { name } = termText(term, i18n.language);
                return (
                  <ListRow
                    key={term.slug}
                    title={name}
                    subtitle={name === term.term ? undefined : term.term}
                    onPress={() =>
                      router.push(`/glossary/${term.slug}` as Href)
                    }
                  />
                );
              })}
            </ListSection>
          );
        })}
        {matches.length === 0 && (
          <ListSection>
            <ListRow title={t("glossary.noResults")} />
          </ListSection>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  search: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
  },
});
