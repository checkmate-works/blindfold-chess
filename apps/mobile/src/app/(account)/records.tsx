import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection, OptionsField } from "../../components";
import { MOBILE_PRACTICE_MODULES } from "../../navigation/practice-modules";
import {
  RANK_PERIODS,
  fetchOwnRanks,
  slugOfModule,
  type OwnRank,
  type RankPeriod,
} from "../../features/records/records-api";
import { spacing } from "../../theme";

/**
 * The user's own rank on each challenge leaderboard, per period — what the
 * app shows of the leaderboard. Other players' rows stay on the web: the
 * app shows no other user's name (see apps/mobile/CLAUDE.md).
 */
export default function RecordsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<RankPeriod>("all-time");
  const [ranks, setRanks] = useState<OwnRank[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: RankPeriod) => {
    const result = await fetchOwnRanks(p);
    if ("error" in result) {
      setFailed(true);
      setRanks(null);
    } else {
      setFailed(false);
      setRanks(result);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(period);
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
      {/* records.periods.{all-time,weekly,monthly} */}
      <OptionsField
        label={t("records.period")}
        options={RANK_PERIODS}
        value={period}
        onChange={setPeriod}
        formatOption={(p) => t(`records.periods.${p}`)}
      />
      <ListSection footer={t("records.note")}>
        {failed ? (
          <ListRow title={t("records.loadFailed")} />
        ) : ranks === null ? (
          <ListRow title={t("records.loading")} />
        ) : ranks.length === 0 ? (
          <ListRow title={t("records.empty")} />
        ) : (
          ranks.map((rank) => (
            <ListRow
              key={`${rank.module}/${rank.key}`}
              title={titleOf(rank)}
              value={t("records.rank", { rank: rank.rank })}
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
