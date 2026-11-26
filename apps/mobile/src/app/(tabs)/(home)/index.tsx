import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { PracticeCard } from "../../../features/practice-list/PracticeCard";
import { PracticeCardSection } from "../../../features/practice-list/PracticeCardSection";
import { Button } from "../../../components/Button";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";
import { NextRankCard } from "../../../features/dojo/NextRankCard";
import { ProgressCard } from "../../../features/records/ProgressCard";
import { useSignUpOffer } from "../../../features/onboarding/hooks/useSignUpOffer";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import { MOBILE_PRACTICE_MODULES } from "../../../navigation/practice-modules";

/** The modules the home tab offers as a quick start, in this order. */
const QUICK_START_SLUGS = ["coordinate-quiz", "square-colors", "legal-moves"];

/** The featured puzzle uses the same card as the catalogue. */
const PUZZLE_MODULE = MOBILE_PRACTICE_MODULES.find((m) => m.slug === "puzzle");

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

      <PracticeCardSection title={t("home.startPractice")}>
        {quickStart.map((item) => (
          <PracticeCard key={item.slug} module={item} />
        ))}
        {PUZZLE_MODULE && (
          <PracticeCard module={PUZZLE_MODULE} title={t("puzzle.daily")} />
        )}
        <Button
          title={t("home.allPractice")}
          variant="outline"
          fullWidth
          onPress={() => router.navigate("/practice")}
        />
      </PracticeCardSection>

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
