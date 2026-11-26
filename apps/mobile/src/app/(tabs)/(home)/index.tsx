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

/**
 * The home tab: the player's progress, the next rank to aim for with a way
 * into the dojo (`NextRankCard`, from the account's current rank), the AI
 * game (the web home leads with the same card), then a quick start into
 * the entry-level practice modules and the way back into the introduction. It is also where the account offer that ends
 * onboarding opens (`useSignUpOffer`).
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
      <ProgressCard />
      <NextRankCard />
      <AiGameCard
        buttonTitle={t("home.playAi")}
        onPress={() => router.push("/play/ai-game")}
      />

      <ListSection title={t("home.startPractice")}>
        {/* practice.coordinateQuiz.title, practice.squareColors.title, practice.legalMoves.title (+ .description) */}
        {quickStart.map((item) => (
          <ListRow
            key={item.slug}
            leading={<ListIcon glyph={item.icon} />}
            title={t(`practice.${item.i18nKey}.title`)}
            subtitle={t(`practice.${item.i18nKey}.description`)}
            onPress={() =>
              router.push(`/practice/${practiceModuleRoute(item)}` as Href)
            }
          />
        ))}
        <ListRow
          leading={<ListIcon glyph="🧩" />}
          title={t("puzzle.daily")}
          subtitle={t("practice.puzzle.description")}
          onPress={() => router.push("/practice/puzzle")}
        />
        <ListRow
          leading={<ListIcon ionicon="grid-outline" />}
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
