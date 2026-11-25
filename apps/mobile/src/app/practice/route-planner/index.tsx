import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { RelatedArticlesSection } from "../../../features/learn/RequiredKnowledgeSection";
import {
  HowToPlayDemo,
  RELATED_ARTICLE_PIECES,
  RELATED_ARTICLES,
  SettingsForm,
} from "../../../features/route-planner/components";
import { useRoutePlannerSettings } from "../../../features/route-planner/hooks";

/**
 * Route planner: how to play, the piece to route, the movement articles of
 * the two pieces and the sign-in row, then the challenge or untimed
 * training.
 */
export default function RoutePlannerSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, isLoaded, updateSettings } = useRoutePlannerSettings();
  const params = { piece: settings.selectedPiece };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={() =>
        router.push({ pathname: "/practice/route-planner/session", params })
      }
      onStartTraining={() =>
        router.push({ pathname: "/practice/route-planner/training", params })
      }
    >
      <HowToPlaySection
        title={t("moduleHelp.routePlanner.howToPlay.title")}
        description={t("moduleHelp.routePlanner.howToPlay.body")}
      >
        <HowToPlayDemo />
      </HowToPlaySection>
      <SettingsForm
        selectedPiece={settings.selectedPiece}
        onChange={(selectedPiece) => updateSettings({ selectedPiece })}
      />
      <RelatedArticlesSection
        slugs={RELATED_ARTICLES}
        pieces={RELATED_ARTICLE_PIECES}
      />
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
