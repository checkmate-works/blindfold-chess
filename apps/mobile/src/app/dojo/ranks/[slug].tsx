import { Stack, router, useLocalSearchParams, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  MUKYU_SLUG,
  isRankSlug,
  rankStanding,
  type EarnedRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";
import type { RankJourney } from "@blindfold-chess/features/dojo-journey";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { RankGoalCard } from "../../../features/dojo/RankGoalCard";
import { RankRequirementList } from "../../../features/dojo/RankRequirementList";
import { RankStageProgress } from "../../../features/dojo/RankStageProgress";
import { guidePath } from "../../../features/dojo/requirements";
import { useDojoJourney } from "../../../features/dojo/use-dojo-journey";

/**
 * Pages read out of the pages counted, for the guide row.
 *
 * An earned rank shows its learn stage, the same count as the stage cell
 * above it. Mukyu has no journey of its own: its guide is read as part of
 * 5kyu's learn stage, so its row counts just those pages of 5kyu's journey.
 */
function guideProgress(
  slug: RankSlug,
  journeyOf: (rank: EarnedRankSlug) => RankJourney,
): { done: number; total: number } | undefined {
  if (slug !== MUKYU_SLUG) {
    return journeyOf(slug).stages.find((s) => s.stage === "learn");
  }
  const pages = journeyOf("5kyu").steps.filter(
    (step) => step.kind === "guidePage" && step.guideRank === MUKYU_SLUG,
  );
  if (pages.length === 0) return undefined;
  return {
    done: pages.filter((step) => step.done).length,
    total: pages.length,
  };
}

/**
 * Rank (段級位の詳細)
 *
 * @description
 * One rank: what it certifies and where the player stands on it, how far
 * each of its stages is (learn, practice, exam), its requirements (the
 * same rows as the dojo's next goal), and the rank's guide (教本) when it
 * has one, read in the app (`dojo/guides/[rank]`) from its first page, with
 * the pages read so far as the row's value. Mukyu has no requirements and
 * no stages, so it shows only its card and guide.
 */
export default function RankScreen() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { highest, journeyOf } = useDojoJourney();
  if (!isRankSlug(slug)) return null;
  const guide = guidePath(slug);
  const journey = slug !== MUKYU_SLUG ? journeyOf(slug) : undefined;
  const pages = guide ? guideProgress(slug, journeyOf) : undefined;

  return (
    <TabScrollView>
      <Stack.Screen options={{ title: t(`ranks.names.${slug}`) }} />
      <RankGoalCard slug={slug} standing={rankStanding(slug, highest)}>
        {journey && <RankStageProgress journey={journey} />}
      </RankGoalCard>
      {journey && (
        <RankRequirementList
          journey={journey}
          title={t("dojo.requirementsTitle")}
        />
      )}
      {guide && (
        <ListSection>
          <ListRow
            leading={<ListIcon ionicon="book-outline" />}
            title={t("dojo.guide")}
            value={
              pages
                ? t("dojo.rankProgress", {
                    done: pages.done,
                    total: pages.total,
                  })
                : undefined
            }
            onPress={() => router.push(guide as Href)}
          />
        </ListSection>
      )}
    </TabScrollView>
  );
}
