import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { resolveStartingSquare } from "@blindfold-chess/features/knight-tour";

import { PracticeSetupScreen } from "../../../components";
import { RequiredKnowledgeSection } from "../../../features/learn/RequiredKnowledgeSection";
import {
  RELATED_ARTICLE_PIECES,
  RELATED_ARTICLES,
  SettingsForm,
} from "../../../features/knight-tour/components";
import { useKnightTourSettings } from "../../../features/knight-tour/hooks";

/**
 * Knight's tour, a free-play module: the web's settings (starting square,
 * blindfold mode) and its two related articles, then one Start. No
 * how-to-play section, sign-in row or training button: the web's free-play
 * page has none of them, and the "?" in the header holds its overview and
 * tutorial text.
 */
export default function KnightTourSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, isLoaded, updateSettings } = useKnightTourSettings();

  const handleStart = () => {
    router.push({
      pathname: "/practice/knight-tour/session",
      params: {
        startingSquare: resolveStartingSquare(settings.startingSquare),
        blindfold: settings.blindfoldMode ? "1" : "0",
      },
    });
  };

  return (
    <PracticeSetupScreen isLoaded={isLoaded} onStart={handleStart}>
      <SettingsForm settings={settings} onUpdate={updateSettings} />
      <RequiredKnowledgeSection
        slugs={RELATED_ARTICLES}
        pieces={RELATED_ARTICLE_PIECES}
        title={t("practice.relatedArticles")}
      />
    </PracticeSetupScreen>
  );
}
