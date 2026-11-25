import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { RelatedArticlesSection } from "../../../features/learn/RequiredKnowledgeSection";
import {
  HowToPlayDemo,
  NoRecordNote,
  RELATED_ARTICLES,
  SettingsForm,
} from "../../../features/quadrants/components";
import { useQuadrantsSettings } from "../../../features/quadrants/hooks";

/**
 * Quadrant anchors: how to play, the board orientation (the web's challenge
 * setup has it; training follows the same choice), the article it builds
 * on, and the note that a run is not recorded.
 */
export default function QuadrantsSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, isLoaded, updateSettings } = useQuadrantsSettings();

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={() =>
        router.push({
          pathname: "/practice/quadrants/session",
          params: { orientation: settings.orientation },
        })
      }
      onStartTraining={() =>
        router.push({
          pathname: "/practice/quadrants/training",
          params: { orientation: settings.orientation },
        })
      }
    >
      <HowToPlaySection
        title={t("moduleHelp.quadrants.howToPlay.title")}
        description={t("moduleHelp.quadrants.howToPlay.body")}
      >
        <HowToPlayDemo />
      </HowToPlaySection>
      <SettingsForm settings={settings} onUpdateSettings={updateSettings} />
      <RelatedArticlesSection slugs={RELATED_ARTICLES} />
      <NoRecordNote />
    </PracticeSetupScreen>
  );
}
