import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { RelatedArticlesSection } from "../../../features/learn/RequiredKnowledgeSection";
import {
  HowToPlayDemo,
  SettingsForm,
} from "../../../features/legal-moves/components";
import { useLegalMovesSettings } from "../../../features/legal-moves/hooks";

/** The web's related articles for legal moves, in its order. */
const RELATED_ARTICLES = [
  "king-movement",
  "knight-movement",
  "rook-movement",
  "bishop-movement",
] as const;

/** The piece the web's card draws for each article. */
const ARTICLE_PIECES = {
  "king-movement": "k",
  "knight-movement": "n",
  "rook-movement": "r",
  "bishop-movement": "b",
} as const;

/**
 * Legal moves: how to play, the piece to drill, the web's four movement
 * articles and the sign-in row, then the challenge or untimed training.
 */
export default function LegalMovesSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, isLoaded, updateSettings } = useLegalMovesSettings();
  const params = { piece: settings.selectedPiece };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={() =>
        router.push({ pathname: "/practice/legal-moves/session", params })
      }
      onStartTraining={() =>
        router.push({ pathname: "/practice/legal-moves/training", params })
      }
    >
      <HowToPlaySection
        title={t("moduleHelp.legalMoves.howToPlay.title")}
        description={t("moduleHelp.legalMoves.howToPlay.body")}
      >
        <HowToPlayDemo />
      </HowToPlaySection>
      <SettingsForm
        selectedPiece={settings.selectedPiece}
        onChange={(selectedPiece) => updateSettings({ selectedPiece })}
      />
      <RelatedArticlesSection
        slugs={RELATED_ARTICLES}
        pieces={ARTICLE_PIECES}
      />
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
