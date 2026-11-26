import { StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  RANK_REQUIREMENTS,
  RANK_SLUGS,
  isRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import {
  DoneMark,
  ListIcon,
  ListRow,
  ListSection,
  TabScrollView,
} from "../../../components";
import { BeltBadge } from "../../../features/dojo/BeltBadge";
import { RankRequirementList } from "../../../features/dojo/RankRequirementList";
import { rankDetailHref } from "../../../features/dojo/stage-target";
import { useDojoJourney } from "../../../features/dojo/use-dojo-journey";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";

/**
 * What to show for a rank param with nothing to list: a note and a way
 * back, to the rank's screen for a rank without requirements (mukyu) or to
 * the dojo tab for a param that is no rank at all.
 */
function NoRequirements({ rank }: { readonly rank: RankSlug | undefined }) {
  const { t } = useTranslation();
  return (
    <ListSection footer={t("dojo.noRequirements")}>
      {rank ? (
        <ListRow
          leading={<ListIcon ionicon="ribbon-outline" />}
          title={t(`ranks.names.${rank}`)}
          onPress={() => router.replace(rankDetailHref(rank))}
        />
      ) : (
        <ListRow
          leading={<ListIcon ionicon="ribbon-outline" />}
          title={t("tabs.dojo")}
          onPress={() => router.dismissTo("/dojo")}
        />
      )}
    </ListSection>
  );
}

/**
 * Rank requirements (昇級条件)
 *
 * @description
 * Everything one rank asks for and nothing else: "Passed n / N" over the
 * rank's requirement rows (`RankRequirementList`), each row showing whether
 * it is met and opening where it is met. It is where a rank's exam stage
 * cell leads: a cell is the way into its whole stage, so like the learn and
 * practice cells it opens the stage's list, where the player sees at a
 * glance which requirements are already passed, instead of dropping them
 * into one requirement's screen.
 *
 * The count is the journey's exam stage, the same numbers as the cell that
 * opened the screen. A rank with no requirements (mukyu), or a param that
 * is no rank, shows a note and the way back instead of an empty list.
 *
 * Once every requirement is met (or the rank is held, which marks them
 * all met), a row under the list leads on to the next rank, so the player
 * who has finished here is not left at a dead end. It opens the next
 * rank's own screen rather than its requirements: a rank starts with its
 * guide and its practice, which that screen shows with the requirements,
 * and opening the requirements alone would skip the player past them.
 * 1dan, the top of the ladder, has no such row.
 *
 * @flow
 * 1. Opened from a rank's exam stage cell (home tab, dojo tab, rank screen)
 * 2. A requirement row → that challenge's setup, the rank's exam or the web
 * 3. All met → the next rank's row → that rank's screen
 */
export default function RankRequirementsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rank } = useLocalSearchParams<{ rank: string }>();
  const { journeyOf } = useDojoJourney();
  const slug = isRankSlug(rank) ? rank : undefined;
  const earned =
    slug !== undefined && slug !== "mukyu" && RANK_REQUIREMENTS[slug].length > 0
      ? slug
      : undefined;
  const title = slug
    ? t("dojo.requirementsScreenTitle", { rank: t(`ranks.names.${slug}`) })
    : t("dojo.requirementsTitle");

  if (earned === undefined) {
    return (
      <TabScrollView>
        <Stack.Screen options={{ title }} />
        <NoRequirements rank={slug} />
      </TabScrollView>
    );
  }

  const journey = journeyOf(earned);
  const exam = journey.stages.find((stage) => stage.stage === "exam");
  const allMet = exam !== undefined && exam.done >= exam.total;
  const next: RankSlug | undefined = RANK_SLUGS[RANK_SLUGS.indexOf(earned) + 1];

  return (
    <TabScrollView>
      <Stack.Screen options={{ title }} />
      {/* One section: the count sits on the list as its heading would. */}
      <View>
        {exam && (
          <View style={styles.summary} testID="requirements-summary">
            {allMet ? <DoneMark size="sm" /> : null}
            <Text style={[styles.summaryText, { color: colors.foreground }]}>
              {`${t("dojo.stageExamPassed")} ${t("dojo.rankProgress", {
                done: exam.done,
                total: exam.total,
              })}`}
            </Text>
          </View>
        )}
        <RankRequirementList journey={journey} />
      </View>
      {allMet && next && (
        <ListSection title={t("dojo.nextRankSection")}>
          <ListRow
            testID="requirements-next-rank"
            leading={<BeltBadge slug={next} />}
            title={t(`ranks.names.${next}`)}
            subtitle={t(`ranks.criteria.${next}`)}
            onPress={() => router.push(rankDetailHref(next))}
          />
        </ListSection>
      )}
    </TabScrollView>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
});
