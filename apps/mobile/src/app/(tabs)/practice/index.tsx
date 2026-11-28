import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  isRankSlug,
  MUKYU_SLUG,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";
import { PRACTICE_MODULE_REGISTRY } from "@blindfold-chess/features/practice-registry";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { FilterChips, TabScrollView } from "../../../components";
import { useDojoJourney } from "../../../features/dojo/use-dojo-journey";
import {
  practiceProgress,
  practiceProgressLabel,
} from "../../../features/practice-list/practice-progress";
import {
  filterRanks,
  modulesOfRank,
  practiceMenuType,
  practiceModuleRank,
} from "../../../features/practice-list/rank-filter";
import { MOBILE_PRACTICE_MODULES } from "../../../navigation/practice-modules";
import type { MobilePracticeModule } from "../../../navigation/practice-modules";
import { PracticeCard } from "../../../features/practice-list/PracticeCard";
import { PracticeCardSection } from "../../../features/practice-list/PracticeCardSection";
import { RankSheet } from "../../../features/practice-list/RankSheet";
import { spacing } from "../../../theme";

const CHALLENGE_SLUGS = new Set<string>(
  PRACTICE_MODULE_REGISTRY.filter((m) => m.hasChallenge).map(
    (m) => m.slugKebab,
  ),
);

/** The chips' ranks; fixed by the module table, so worked out once. */
const FILTER_RANKS = filterRanks(MOBILE_PRACTICE_MODULES);

/** The value of the chip that lists every practice. */
const ALL = "all";

/**
 * The practice tab: every module mobile implements, split like the web's
 * practice page into the timed challenges (scored against the clock and the
 * mistake limit) and the free-play drills, narrowed by rank with the chips
 * above them.
 *
 * @description
 * The chips are "All" and then only the ranks at least one of the app's
 * practices belongs to (today mukyu, 5kyu, 4kyu, 3kyu, 2kyu), lowest first.
 * 1kyu and 1dan get no chip: their requirements are AI games, which have no
 * row here, and a chip that can only show an empty list is noise.
 *
 * Narrowing keeps the two sections: whether a practice is a timed,
 * recorded challenge or free play is independent of the rank it belongs
 * to, so the heading still says it. A section left empty by the filter is
 * not drawn. A practice no rank asks for is listed under "All" only.
 *
 * Another screen can open the tab already narrowed with
 * `/practice?rank=<slug>` (the dojo's practice stage does). A rank without
 * a chip, or a value that is no rank, is ignored.
 *
 * A row shows how far its practice is through its rank's practice stage,
 * counted from the same journey as the rank card: the done mark once its one
 * challenge is tried, or "n / N" for several (legal moves on 4kyu). Mukyu
 * practices and those with no challenge on their rank show nothing.
 */
export default function PracticeIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { journeyOf } = useDojoJourney();
  const { rank: rankParam } = useLocalSearchParams<{ rank?: string }>();
  const [selected, setSelected] = useState<RankSlug | typeof ALL>(ALL);
  // The rank whose introduction is open, and the last one opened, which
  // the sheet keeps drawing while it slides away.
  const [sheetRank, setSheetRank] = useState<RankSlug>();
  const [lastSheetRank, setLastSheetRank] = useState<RankSlug>();
  const openRankSheet = (rank: RankSlug) => {
    setSheetRank(rank);
    setLastSheetRank(rank);
  };

  // A tab screen stays mounted after it is left, so the param would still
  // read the same rank the next time another screen opens the tab with it:
  // the value would not change, this effect would not run again, and a
  // filter the player picked in between would stay on. Clearing the param
  // once it is applied makes every `?rank=` a fresh request.
  useEffect(() => {
    if (rankParam === undefined) return;
    if (isRankSlug(rankParam) && FILTER_RANKS.includes(rankParam)) {
      setSelected(rankParam);
      router.setParams({ rank: undefined });
    }
  }, [rankParam, router]);

  const shown = modulesOfRank(selected === ALL ? undefined : selected);
  const challenges = shown.filter((m) => CHALLENGE_SLUGS.has(m.slug));
  const freePlay = shown.filter((m) => !CHALLENGE_SLUGS.has(m.slug));

  const progressOf = (item: MobilePracticeModule) => {
    const rank = practiceModuleRank(item);
    if (rank === undefined || rank === MUKYU_SLUG) return undefined;
    return practiceProgressLabel(
      practiceProgress(journeyOf(rank), practiceMenuType(item)),
      t,
    );
  };

  const chipOptions = [
    { value: ALL, label: t("practice.filter.all") },
    ...FILTER_RANKS.map((rank) => ({
      value: rank,
      // ranks.names.mukyu, ranks.names.5kyu, ranks.names.4kyu, ranks.names.3kyu, ranks.names.2kyu
      label: t(`ranks.names.${rank}`),
    })),
  ];

  const renderCard = (item: MobilePracticeModule) => (
    <PracticeCard
      key={item.slug}
      module={item}
      progress={progressOf(item)}
      onRankPress={openRankSheet}
    />
  );

  return (
    <TabScrollView>
      <RankSheet
        slug={sheetRank}
        lastSlug={lastSheetRank}
        onClose={() => setSheetRank(undefined)}
      />
      <View style={styles.filter}>
        <FilterChips
          options={chipOptions}
          selected={selected}
          onSelect={(value) => setSelected(isRankSlug(value) ? value : ALL)}
          accessibilityLabel={t("practice.filter.label")}
          testID="practice-rank-filter"
        />
      </View>
      {challenges.length > 0 && (
        <PracticeCardSection
          title={t("practice.challengeSection")}
          footer={t("practice.challengeSectionNote")}
        >
          {challenges.map(renderCard)}
        </PracticeCardSection>
      )}
      {freePlay.length > 0 && (
        <PracticeCardSection title={t("practice.freePlaySection")}>
          {freePlay.map(renderCard)}
        </PracticeCardSection>
      )}
    </TabScrollView>
  );
}

const styles = StyleSheet.create({
  // The chips scroll under the screen's edges: the row cancels the scroll
  // view's side padding and `FilterChips` puts the same inset back inside,
  // so the first chip lines up with the panels below at rest.
  filter: {
    marginHorizontal: -spacing.md,
    marginBottom: spacing.md,
  },
});
