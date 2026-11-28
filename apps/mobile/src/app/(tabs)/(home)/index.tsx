import { TabScrollView } from "../../../components";
import { RecordCtaCard } from "../../../features/account/RecordCtaCard";
import { NextRankCard } from "../../../features/dojo/NextRankCard";
import { DailyPuzzleCard } from "../../../features/puzzle/DailyPuzzleCard";
import { useSignUpOffer } from "../../../features/onboarding/hooks/useSignUpOffer";

/**
 * The home tab, top to bottom: the next rank to aim for with a way into the
 * dojo (`NextRankCard`, from the account's current rank), the way into an
 * account for a player without a finished one (`RecordCtaCard`), then the
 * day's puzzle (`DailyPuzzleCard`, the web dashboard's "Daily Puzzle"). It
 * is also where the account offer that ends onboarding opens
 * (`useSignUpOffer`).
 *
 * The order puts the one thing to do now first: the rank ladder is what the
 * app is built around, so the next rank leads. The account card comes
 * straight after it, since an account is what keeps that progress. The
 * daily puzzle comes last: it is a standalone extra for the day rather than
 * a step towards the rank, and it disappears when there is none.
 *
 * The player's username, rank, level and EXP are not repeated here: mypage,
 * behind the header's person icon, already heads with them.
 * `NextRankCard`'s contents belong to the dojo feature; this screen only
 * decides where it sits.
 *
 * Home lists no practices and no AI game: the next-rank card already points
 * at the next practice, and the play tab sits in the middle of the tab bar,
 * with a badge counting the games left in progress. Replaying the
 * introduction lives in settings.
 */
export default function HomeTab() {
  useSignUpOffer();

  return (
    <TabScrollView>
      <NextRankCard />
      <RecordCtaCard placement="home" />
      <DailyPuzzleCard />
    </TabScrollView>
  );
}
