import { StyleSheet, Text, View } from "react-native";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  EARNED_RANK_SLUGS,
  nextRankSlug,
  rankStanding,
} from "@blindfold-chess/features/dojo-ranks";

import { ListRow, ListSection, TabScrollView } from "../../../components";
import { BeltBadge } from "../../../features/dojo/BeltBadge";
import { RankGoalCard } from "../../../features/dojo/RankGoalCard";
import { RankLadder } from "../../../features/dojo/RankLadder";
import { RankRequirementList } from "../../../features/dojo/RankRequirementList";
import { useCurrentRank } from "../../../features/dojo/use-current-rank";
import { fontSize, spacing, useTheme } from "../../../theme";

/**
 * Dojo (道場)
 *
 * @description
 * The belt ladder from 無級 to 初段, in the order the web's dojo reads:
 * the current rank over the ladder, the next goal with its requirements,
 * then every rank as one row of the road to black belt. A rank row opens
 * the rank's own screen (`dojo/ranks/[slug]`).
 *
 * The rank is the signed-in account's highest one (`GET /me`); signed out
 * there is none, so the goal is 5kyu and a line under the ladder says an
 * account records it. Whether each requirement is already met is not
 * shown: the mobile API returns only the highest rank, not the best scores
 * the requirements are judged on.
 *
 * 5kyu to 3kyu are earned with challenges the app has. 2kyu, 1kyu and 1dan
 * ask for posting a position or publishing a game, which the first mobile
 * release leaves to the web (it has none of the social side), so their rows
 * open the web page instead.
 *
 * @flow
 * 1. A requirement row of the next goal opens that module's setup, where
 *    the challenge starts
 * 2. A rank row opens the rank's screen
 */
export default function DojoTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { highest, signedIn } = useCurrentRank();
  const next = nextRankSlug(highest);

  return (
    <TabScrollView>
      <View style={styles.ladder}>
        <RankLadder highest={highest} />
        {!signedIn && (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            {t("dojo.signInNote")}{" "}
            <Text
              accessibilityRole="link"
              style={{ color: colors.primary }}
              onPress={() => router.push("/sign-in")}
            >
              {t("dojo.signInLink")}
            </Text>
          </Text>
        )}
      </View>

      {next ? (
        <>
          <RankGoalCard
            slug={next}
            standing="next"
            eyebrow={t("dojo.nextRank")}
          />
          <RankRequirementList
            slug={next}
            title={t("dojo.requirementsTitle")}
          />
        </>
      ) : (
        <RankGoalCard slug="1dan" standing="achieved">
          <Text style={[styles.note, { color: colors.foreground }]}>
            {t("dojo.allAchieved")}
          </Text>
        </RankGoalCard>
      )}

      <ListSection title={t("dojo.journeyTitle")}>
        {EARNED_RANK_SLUGS.map((slug) => (
          <ListRow
            key={slug}
            testID={`dojo-rank-${slug}`}
            leading={<BeltBadge slug={slug} />}
            title={t(`ranks.names.${slug}`)}
            subtitle={t(`ranks.criteria.${slug}`)}
            // dojo.status.achieved, dojo.status.next, dojo.status.locked
            value={t(`dojo.status.${rankStanding(slug, highest)}`)}
            onPress={() => router.push(`/dojo/ranks/${slug}` as Href)}
          />
        ))}
      </ListSection>
    </TabScrollView>
  );
}

const styles = StyleSheet.create({
  ladder: {
    gap: spacing.sm,
  },
  note: {
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
});
