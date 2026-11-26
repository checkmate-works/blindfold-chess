import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";
import { NextRankCard } from "../../../features/dojo/NextRankCard";
import { ProgressCard } from "../../../features/records/ProgressCard";
import { useSignUpOffer } from "../../../features/onboarding/hooks/useSignUpOffer";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../../../navigation/practice-modules";

/** The modules the home tab offers as a quick start, in this order. */
const QUICK_START_SLUGS = ["coordinate-quiz", "square-colors", "legal-moves"];

/** The puzzle module's icon, for the daily puzzle row. */
const PUZZLE_ICON = MOBILE_PRACTICE_MODULES.find(
  (m) => m.slug === "puzzle",
)?.icon;

/**
 * The home tab, top to bottom: the next rank to aim for with a way into the
 * dojo (`NextRankCard`, from the account's current rank), the summary of the
 * player's records (`ProgressCard`), the AI game, a quick start into the
 * entry-level practice modules, and the way back into the introduction. It
 * is also where the account offer that ends onboarding opens
 * (`useSignUpOffer`).
 *
 * The order puts the one thing to do now first: the rank ladder is what the
 * app is built around, so the next rank leads, and the record summary that
 * measures progress towards it comes straight after. The AI game and the
 * practice list are ways to spend the session once the goal is in view.
 * `NextRankCard`'s contents belong to the dojo feature; this screen only
 * decides where it sits.
 */
export default function HomeTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearStatus } = useOnboardingStatus();
  useSignUpOffer();

  const quickStart = QUICK_START_SLUGS.flatMap(
    (slug) => MOBILE_PRACTICE_MODULES.find((m) => m.slug === slug) ?? [],
  );

  return (
    <TabScrollView>
      <NextRankCard />
      <ProgressCard />
      <AiGameCard
        buttonTitle={t("home.playAi")}
        onPress={() => router.push("/play/ai-game")}
      />

      <ListSection title={t("home.startPractice")}>
        {/* practice.coordinateQuiz.title, practice.squareColors.title, practice.legalMoves.title (+ .description) */}
        {quickStart.map((item) => (
          <ListRow
            key={item.slug}
            leading={<ListIcon ionicon={item.icon} />}
            title={t(`practice.${item.i18nKey}.title`)}
            subtitle={t(`practice.${item.i18nKey}.description`)}
            onPress={() =>
              router.push(`/practice/${practiceModuleRoute(item)}` as Href)
            }
          />
        ))}
        <ListRow
          leading={<ListIcon ionicon={PUZZLE_ICON} />}
          title={t("puzzle.daily")}
          subtitle={t("practice.puzzle.description")}
          onPress={() => router.push("/practice/puzzle")}
        />
        <ListRow
          leading={<ListIcon ionicon="apps-outline" />}
          title={t("home.allPractice")}
          onPress={() => router.navigate("/practice")}
        />
      </ListSection>

      <ListSection title={t("home.gettingStarted")}>
        <ListRow
          leading={<ListIcon ionicon="chatbubbles-outline" />}
          title={t("home.replayOnboarding")}
          onPress={() => router.push("/onboarding")}
        />
        <ListRow
          leading={<ListIcon ionicon="book-outline" />}
          title={t("home.learnBasics")}
          onPress={() => router.navigate("/learn")}
        />
        {__DEV__ ? (
          <ListRow
            leading={<ListIcon ionicon="refresh-outline" />}
            title="Reset Onboarding (Debug)"
            onPress={async () => {
              await clearStatus();
              router.replace("/onboarding");
            }}
          />
        ) : null}
      </ListSection>
    </TabScrollView>
  );
}
