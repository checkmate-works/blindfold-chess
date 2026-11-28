import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { ListRow, ListSection, TabScrollView } from "../components";
import { changeLanguage, type Locale } from "../i18n";
import { AccountSection } from "../features/settings/AccountSection";
import { BoardPreferencesSection } from "../features/settings/BoardPreferencesSection";
import { TutorialSection } from "../features/settings/TutorialSection";
import { openWebPage } from "../lib/web-pages";

/** The web pages the About section links to, in display order. */
const ABOUT_PAGES = [
  { key: "faq", path: "/faq" },
  { key: "contact", path: "/contact" },
  { key: "terms", path: "/terms" },
  { key: "privacy", path: "/privacy" },
  { key: "licenses", path: "/licenses" },
] as const;

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

/**
 * Settings: account, language, board appearance, the tutorial and the
 * About pages.
 *
 * @description
 * Pushed on the root stack from mypage's last row, not a tab of its own:
 * the tab bar holds five tabs (iOS folds a sixth into a "More" tab), and
 * the fifth slot went to the dojo, which a player visits far more often
 * than settings. The account rows open sign-in and username setup in the
 * account modal over it, and push My Records on top of it.
 */
export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as Locale;

  const handleLanguageChange = (language: Locale) => {
    if (language !== currentLanguage) {
      changeLanguage(language);
    }
  };

  return (
    <TabScrollView>
      <AccountSection />
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
      <TutorialSection />
      {/* settings.about.{faq,contact,terms,privacy,licenses} */}
      <ListSection
        title={t("settings.about.title")}
        footer={t("settings.about.version", {
          version: Constants.expoConfig?.version ?? "",
        })}
      >
        {ABOUT_PAGES.map(({ key, path }) => (
          <ListRow
            key={key}
            title={t(`settings.about.${key}`)}
            accessory="external"
            onPress={() => openWebPage(path, currentLanguage)}
          />
        ))}
      </ListSection>
    </TabScrollView>
  );
}
