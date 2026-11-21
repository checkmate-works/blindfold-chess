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
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import { MOBILE_PRACTICE_MODULES } from "../../../navigation/practice-modules";

/** The modules the home tab offers as a quick start, in this order. */
const QUICK_START_SLUGS = ["coordinate-quiz", "square-colors", "legal-moves"];

/**
 * The home tab: the AI game first (the web home leads with the same card),
 * then a quick start into the entry-level practice modules and the way back
 * into the introduction.
 */
export default function HomeTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearStatus } = useOnboardingStatus();

  const quickStart = QUICK_START_SLUGS.flatMap(
    (slug) => MOBILE_PRACTICE_MODULES.find((m) => m.slug === slug) ?? [],
  );

  return (
    <TabScrollView>
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
            onPress={() => router.push(`/practice/${item.slug}` as Href)}
          />
        ))}
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
