import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../theme";
import {
  changeLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../../i18n";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ja: "settings.languageJapanese",
  en: "settings.languageEnglish",
  es: "settings.languageSpanish",
  "pt-BR": "settings.languagePortuguese",
};

export default function SettingsTab() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = (language: SupportedLanguage) => {
    if (language !== currentLanguage) {
      changeLanguage(language);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("tabs.settings")}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("settings.language")}
          </Text>
          <View
            style={[
              styles.optionList,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {SUPPORTED_LANGUAGES.map((language, index) => {
              const isSelected = language === currentLanguage;
              const isLast = index === SUPPORTED_LANGUAGES.length - 1;
              return (
                <TouchableOpacity
                  key={language}
                  onPress={() => handleLanguageChange(language)}
                  style={[
                    styles.optionItem,
                    !isLast && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.foreground },
                      isSelected && { fontWeight: fontWeight.semibold },
                    ]}
                  >
                    {t(LANGUAGE_LABELS[language])}
                  </Text>
                  {isSelected && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.xs,
  },
  optionList: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionLabel: {
    fontSize: fontSize.md,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#ffffff",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
