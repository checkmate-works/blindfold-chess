import { Stack, useLocalSearchParams } from "expo-router";
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
import { openWebPage } from "../../../lib/web-pages";

/**
 * Rank (段級位の詳細)
 *
 * @description
 * One rank: what it certifies and where the player stands on it, its
 * requirements (the same rows as the dojo's next goal), and the web's guide
 * (教本) for the rank when it has one — the guides are long illustrated
 * pages that stay on the web for now. Mukyu has no requirements, so it
 * shows only its card and guide.
 */
export default function RankScreen() {
  const { t, i18n } = useTranslation();
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
            accessory="external"
            onPress={() => openWebPage(guide, i18n.language)}
          />
        </ListSection>
      )}
    </TabScrollView>
  );
}
