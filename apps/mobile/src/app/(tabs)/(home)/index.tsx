import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { TabScrollView } from "../../../components";
import { RecordCtaCard } from "../../../features/account/RecordCtaCard";
import { AiGameCard } from "../../../features/ai-game/components/AiGameCard";
import { NextRankCard } from "../../../features/dojo/NextRankCard";
import { ProgressCard } from "../../../features/records/ProgressCard";
import { useSignUpOffer } from "../../../features/onboarding/hooks/useSignUpOffer";

/**
 * The home tab, top to bottom: the next rank to aim for with a way into the
 * dojo (`NextRankCard`, from the account's current rank), the way into an
 * account for a player without a finished one (`RecordCtaCard`), the
 * summary of the player's records (`ProgressCard`) and the AI game. It is
 * also where the account offer that ends onboarding opens
 * (`useSignUpOffer`).
 *
 * The order puts the one thing to do now first: the rank ladder is what the
 * app is built around, so the next rank leads. The account card comes
 * straight after it, since an account is what keeps that progress; the
 * record summary (signed in only) measures progress towards the rank. The
 * AI game is a way to spend the session once the goal is in view.
 * `NextRankCard`'s contents belong to the dojo feature; this screen only
 * decides where it sits.
 *
 * Home lists no practices: the next-rank card already points at the next
 * one, and the practice tab is one press away. Replaying the introduction
 * lives in settings.
 */
export default function HomeTab() {
  const { t } = useTranslation();
  const router = useRouter();
  useSignUpOffer();

  return (
    <TabScrollView>
      <NextRankCard />
      <RecordCtaCard />
      <ProgressCard />
      <AiGameCard
        buttonTitle={t("home.playAi")}
        onPress={() => router.push("/play/ai-game")}
      />
    </TabScrollView>
  );
}
