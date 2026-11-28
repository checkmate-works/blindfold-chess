import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection, OptionsField } from "../components";
import { MOBILE_PRACTICE_MODULES } from "../navigation/practice-modules";
import {
  RANK_PERIODS,
  fetchOwnRanks,
  slugOfModule,
  type OwnRank,
  type RankPeriod,
} from "../features/records/records-api";
import { spacing } from "../theme";

/**
 * The user's own rank on each challenge leaderboard, per period — the web
 * home's "Your Rankings", and all the app shows of the leaderboard. A row
 * of mypage, beside My Records. Other players' rows stay on the web: the
 * app shows no other user's name (see apps/mobile/CLAUDE.md).
 */
export default function RanksScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<RankPeriod>("all-time");
  const [ranks, setRanks] = useState<OwnRank[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Loads the ranks of `p`. `isCurrent` is asked once the response is in;
   * when it says no, the response is dropped so it cannot overwrite the
   * ranks of a period chosen after the request went out.
   */
  const load = useCallback(
    async (p: RankPeriod, isCurrent: () => boolean = () => true) => {
      const result = await fetchOwnRanks(p);
      if (!isCurrent()) return;
      if ("error" in result) {
        setFailed(true);
        setRanks(null);
      } else {
        setFailed(false);
        setRanks(result);
      }
    },
    [],
  );

  // Switching the period re-runs this effect while the previous period's
  // request may still be in flight; a slow "all-time" answer arriving after
  // "weekly" would otherwise show all-time ranks under the weekly label. The
  // cleanup marks that earlier request stale (also on blur).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(period, () => active);
      return () => {
        active = false;
      };
    }, [load, period]),
  );

  const titleOf = (rank: OwnRank) => {
    const slug = slugOfModule(rank.module);
    const module = MOBILE_PRACTICE_MODULES.find((m) => m.slug === slug);
    const name = module ? t(`practice.${module.i18nKey}.title`) : rank.module;
    // records.keys.{white,black,random,king,queen,rook,bishop,knight,pawn}
    return rank.key === "default"
      ? name
      : `${name} · ${t(`records.keys.${rank.key}`, { defaultValue: rank.key })}`;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load(period);
            setRefreshing(false);
          }}
        />
      }
    >
      {/* ownRanks.periods.{all-time,weekly,monthly} */}
      <OptionsField
        label={t("ownRanks.period")}
        options={RANK_PERIODS}
        value={period}
        onChange={setPeriod}
        formatOption={(p) => t(`ownRanks.periods.${p}`)}
      />
      <ListSection footer={t("ownRanks.note")}>
        {failed ? (
          <ListRow title={t("records.loadFailed")} />
        ) : ranks === null ? (
          <ListRow title={t("records.loading")} />
        ) : ranks.length === 0 ? (
          <ListRow title={t("ownRanks.empty")} />
        ) : (
          ranks.map((rank) => (
            <ListRow
              key={`${rank.module}/${rank.key}`}
              title={titleOf(rank)}
              value={t("ownRanks.rank", { rank: rank.rank })}
            />
          ))
        )}
      </ListSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
});
