import { StyleSheet, Text, View } from "react-native";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  RANK_REQUIREMENTS,
  nextRankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { Button } from "../../components";
import { openWebPage } from "../../lib/web-pages";
import { fontSize, useTheme } from "../../theme";
import { RankGoalCard } from "./RankGoalCard";
import { requirementLabel, requirementTarget } from "./requirements";
import { useCurrentRank } from "./use-current-rank";

/**
 * The home tab's pointer into the dojo: the rank to aim for next (after the
 * player's current one; 5kyu when signed out), with a button straight into
 * its first requirement and one into the dojo. Once 1dan is held it says so
 * and only links the dojo.
 */
export function NextRankCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { highest } = useCurrentRank();
  const next = nextRankSlug(highest);
  const openDojo = () => router.navigate("/dojo");

  if (!next) {
    return (
      <RankGoalCard slug="1dan" standing="achieved">
        <Text style={[styles.body, { color: colors.foreground }]}>
          {t("home.allAchievedBody")}
        </Text>
        <Button
          title={t("home.openDojo")}
          variant="outline"
          onPress={openDojo}
        />
      </RankGoalCard>
    );
  }

  const first = RANK_REQUIREMENTS[next][0];
  const target = first ? requirementTarget(first) : undefined;

  return (
    <RankGoalCard slug={next} standing="next" eyebrow={t("home.nextRankTitle")}>
      <View style={styles.actions}>
        {first && target && (
          <Button
            title={requirementLabel(first, t)}
            icon={target.kind === "web" ? "open-outline" : "stopwatch-outline"}
            onPress={() =>
              target.kind === "practice"
                ? router.push(target.pathname as Href)
                : openWebPage(target.path, i18n.language)
            }
          />
        )}
        <Button
          title={t("home.openDojo")}
          variant="ghost"
          onPress={openDojo}
          testID="home-open-dojo"
        />
      </View>
    </RankGoalCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 4,
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
});
