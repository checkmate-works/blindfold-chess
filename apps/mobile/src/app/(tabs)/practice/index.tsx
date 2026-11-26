import { PRACTICE_MODULE_REGISTRY } from "@blindfold-chess/features/practice-registry";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../../../navigation/practice-modules";
import type { MobilePracticeModule } from "../../../navigation/practice-modules";

const CHALLENGE_SLUGS = new Set<string>(
  PRACTICE_MODULE_REGISTRY.filter((m) => m.hasChallenge).map(
    (m) => m.slugKebab,
  ),
);

/**
 * The practice tab: every module mobile implements, split like the web's
 * practice page into the timed challenges (scored against the clock and the
 * mistake limit) and the free-play drills.
 */
export default function PracticeIndex() {
  const { t } = useTranslation();
  const router = useRouter();

  const challenges = MOBILE_PRACTICE_MODULES.filter((m) =>
    CHALLENGE_SLUGS.has(m.slug),
  );
  const freePlay = MOBILE_PRACTICE_MODULES.filter(
    (m) => !CHALLENGE_SLUGS.has(m.slug),
  );

  // `practice.${i18nKey}.title` / `.description` (i18nKey from MOBILE_PRACTICE_MODULES): practice.coordinateQuiz.title, practice.legalMoves.title, practice.boardSymmetry.title, practice.squareColors.title, practice.diagonalQuiz.title, practice.routePlanner.title, practice.quadrants.title, practice.knightTour.title, practice.algebraicNotation.title, practice.fen.title, and the same with .description
  const renderRow = (item: MobilePracticeModule) => (
    <ListRow
      key={item.slug}
      testID={`practice-${item.slug}`}
      leading={<ListIcon ionicon={item.icon} />}
      title={t(`practice.${item.i18nKey}.title`)}
      subtitle={t(`practice.${item.i18nKey}.description`)}
      onPress={() =>
        router.push(`/practice/${practiceModuleRoute(item)}` as Href)
      }
    />
  );

  return (
    <TabScrollView>
      <ListSection
        title={t("practice.challengeSection")}
        footer={t("practice.challengeSectionNote")}
      >
        {challenges.map(renderRow)}
      </ListSection>
      <ListSection title={t("practice.freePlaySection")}>
        {freePlay.map(renderRow)}
      </ListSection>
    </TabScrollView>
  );
}
