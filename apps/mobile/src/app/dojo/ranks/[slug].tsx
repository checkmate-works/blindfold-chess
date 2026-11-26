import { Stack, router, useLocalSearchParams, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  MUKYU_SLUG,
  isRankSlug,
  rankStanding,
} from "@blindfold-chess/features/dojo-ranks";

import {
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { RankGoalCard } from "../../../features/dojo/RankGoalCard";
import { RankRequirementList } from "../../../features/dojo/RankRequirementList";
import { guidePath } from "../../../features/dojo/requirements";
import { useCurrentRank } from "../../../features/dojo/use-current-rank";

/**
 * Rank (段級位の詳細)
 *
 * @description
 * One rank: what it certifies and where the player stands on it, its
 * requirements (the same rows as the dojo's next goal), and the rank's guide
 * (教本) when it has one, read in the app (`dojo/guides/[rank]`). Mukyu has
 * no requirements, so it shows only its card and guide.
 */
export default function RankScreen() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { highest } = useCurrentRank();
  if (!isRankSlug(slug)) return null;
  const guide = guidePath(slug);

  return (
    <TabScrollView>
      <Stack.Screen options={{ title: t(`ranks.names.${slug}`) }} />
      <RankGoalCard slug={slug} standing={rankStanding(slug, highest)} />
      {slug !== MUKYU_SLUG && (
        <RankRequirementList slug={slug} title={t("dojo.requirementsTitle")} />
      )}
      {guide && (
        <ListSection>
          <ListRow
            leading={<ListIcon ionicon="book-outline" />}
            title={t("dojo.guide")}
            onPress={() => router.push(guide as Href)}
          />
        </ListSection>
      )}
    </TabScrollView>
  );
}
