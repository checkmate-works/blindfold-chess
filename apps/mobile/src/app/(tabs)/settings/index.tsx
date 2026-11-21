import { useTranslation } from "react-i18next";
import { ListRow, ListSection, TabScrollView } from "../../../components";
import { changeLanguage, type Locale } from "../../../i18n";
import { BoardPreferencesSection } from "../../../features/settings/BoardPreferencesSection";

const LANGUAGE_LABELS: Record<Locale, string> = {
  ja: "settings.languageJapanese",
  en: "settings.languageEnglish",
  es: "settings.languageSpanish",
  "pt-BR": "settings.languagePortuguese",
};

/**
 * The order the picker lists the languages in — Japanese first, which is
 * not the order the shared SUPPORTED_LOCALES declares. Taken from the label
 * map's keys so the membership list stays single-sourced: `Record<Locale,
 * string>` makes the compiler demand an entry per locale, so a locale added
 * to the shared list cannot go missing from the picker.
 */
const LANGUAGE_ORDER = Object.keys(LANGUAGE_LABELS) as Locale[];

export default function SettingsTab() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as Locale;

  const handleLanguageChange = (language: Locale) => {
    if (language !== currentLanguage) {
      changeLanguage(language);
    }
  };

  return (
    <TabScrollView>
      <ListSection title={t("settings.language")}>
        {LANGUAGE_ORDER.map((language) => (
          <ListRow
            key={language}
            title={t(LANGUAGE_LABELS[language])}
            accessory={language === currentLanguage ? "check" : "none"}
            onPress={() => handleLanguageChange(language)}
          />
        ))}
      </ListSection>
      <BoardPreferencesSection />
    </TabScrollView>
  );
}
