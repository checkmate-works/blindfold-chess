import { StyleSheet, Text, View } from "react-native";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "../../components";
import { openWebPage } from "../../lib/web-pages";
import { fontSize, spacing, useTheme } from "../../theme";
import { BeltButton } from "./BeltButton";
import { RankGoalCard } from "./RankGoalCard";
import { RankStageProgress } from "./RankStageProgress";
import { nextStepOf } from "./next-step";
import { useDojoJourney } from "./use-dojo-journey";

/**
 * The home tab's pointer into the dojo: the rank to aim for next (after the
 * player's current one; 5kyu when signed out), how far each of its stages
 * is, and one button in the belt's colours straight into the next step
 * (`nextStepOf`). Under it, a link to the practice tab for a player who
 * would rather pick something else. Once 1dan is held it only says so.
 *
 * There is no link into the dojo itself: the dojo is a tab of its own, one
 * press away in the tab bar under this card, so a link here would only
 * repeat it.
 *
 * When every step of the next rank is done but the rank is not granted yet
 * (the server has not recorded it), there is no next step and no button.
 */
export function NextRankCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { nextRank, nextJourney } = useDojoJourney();

  if (!nextRank || !nextJourney) {
    return (
      <RankGoalCard slug="1dan" standing="achieved">
        <Text style={[styles.body, { color: colors.foreground }]}>
          {t("home.allAchievedBody")}
        </Text>
      </RankGoalCard>
    );
  }

  const step = nextStepOf(nextJourney, t);

  return (
    <RankGoalCard slug={nextRank} eyebrow={t("home.nextRankTitle")}>
      <RankStageProgress journey={nextJourney} />
      <View style={styles.actions}>
        {step && (
          <BeltButton
            slug={nextRank}
            title={step.label}
            icon={step.icon}
            testID="home-next-step"
            onPress={() =>
              step.target.kind === "practice"
                ? router.push(step.target.pathname as Href)
                : openWebPage(step.target.path, i18n.language)
            }
          />
        )}
        <View style={styles.links}>
          <Button
            title={t("home.nextStep.choosePractice")}
            variant="ghost"
            size="sm"
            onPress={() => router.navigate("/practice")}
            testID="home-choose-practice"
          />
        </View>
      </View>
    </RankGoalCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
});
