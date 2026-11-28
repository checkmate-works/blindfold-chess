import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  DASHBOARD_PERIODS,
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  getComparisonLabelKey,
  getNavigablePreviousPeriod,
  getPreviousPeriodLabel,
} from "@blindfold-chess/features/challenge-records";
import { LEGAL_MOVES_PIECE_SELECTIONS } from "@blindfold-chess/features/legal-moves";
import type { BoardOrientation, PieceType } from "@blindfold-chess/types";

import {
  BoardOrientationSelector,
  Button,
  FilterChips,
  ListRow,
  ListSection,
  PieceSelector,
  SelectRow,
} from "../../components";
import { practiceModuleRoute } from "../../navigation/practice-modules";
import {
  RecordColumnsHeader,
  RecordRow,
} from "../../features/records/RecordRow";
import { RecordStats } from "../../features/records/RecordStats";
import { ScoreChart } from "../../features/records/ScoreChart";
import { menuNameOf, practiceModuleOf } from "../../features/records/menu-name";
import { useRecordsDashboard } from "../../features/records/use-records-dashboard";
import { fontSize, spacing, useTheme } from "../../theme";

const PIECE_OF: Record<string, PieceType | null> = {
  king: "k",
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
  random: null,
};

/**
 * My Records (the web's `/mypage/challenges`): the player's own challenge
 * results for one period and one challenge.
 *
 * @description
 * The web's sections in the web's order, in the app's parts:
 * - the period as filter chips (the web's select), then the challenge as a
 *   select row listing only the challenges played in the period, then the
 *   key a keyed challenge is split by (coordinate quiz's orientation, legal
 *   moves' piece) with the setup screens' own pickers;
 * - best and average score, each with its change from the period before;
 * - the score trend, this period over the one before (tap the previous
 *   period's legend entry to open it, as on the web);
 * - the five newest runs, with a row into every result (`records-results`);
 * - Take the Challenge, which closes the account modal and opens the
 *   challenge's setup.
 *
 * Pull to refresh reads everything again; it is also read again whenever
 * the screen comes back into view. The web's help tour is not ported: each
 * section is labelled, and the web's tour only says what the labels do.
 * Nor is the web's grid of related practices, which carries an ad slot.
 */
export default function RecordsScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = i18n.language;
  const dashboard = useRecordsDashboard(locale);
  const [refreshing, setRefreshing] = useState(false);

  const {
    period,
    selectedMenu,
    availableMenuTypes,
    keyFilter,
    failed,
    loading,
  } = dashboard;

  // records.periods.{thisWeek,lastWeek,thisMonth,lastMonth,twoWeeksAgo,twoMonthsAgo}
  const periodLabel = t(`records.periods.${period}`);
  const previousLabel = t(`records.periods.${getPreviousPeriodLabel(period)}`);
  const navigablePrevious = getNavigablePreviousPeriod(period);

  const openChallenge = () => {
    const module = selectedMenu ? practiceModuleOf(selectedMenu) : undefined;
    if (!module) return;
    // A root-stack screen pushed from inside the account modal opens under
    // it on iOS, out of sight, so the modal closes first.
    router.dismissTo("/");
    router.push(`/practice/${practiceModuleRoute(module)}`);
  };

  const body = () => {
    if (availableMenuTypes === null) {
      return (
        <ListSection>
          {failed ? (
            <ListRow title={t("records.loadFailed")} />
          ) : (
            <ListRow title={t("records.loading")} />
          )}
        </ListSection>
      );
    }
    if (availableMenuTypes.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t("records.noData")}
          </Text>
          <Button
            title={t("records.goToPractice")}
            size="lg"
            fullWidth
            onPress={() => router.dismissTo("/practice")}
            testID="records-go-to-practice"
          />
        </View>
      );
    }
    return (
      <>
        <ListSection>
          <SelectRow
            label={t("records.menu")}
            options={availableMenuTypes}
            value={selectedMenu}
            onChange={dashboard.selectMenu}
            formatOption={(menu) => menuNameOf(menu, t)}
            optionTestID="records-menu"
            testID="records-menu"
          />
        </ListSection>

        {selectedMenu && ORIENTATION_FILTER_MENUS.has(selectedMenu) ? (
          <ListSection>
            <View style={styles.panelBody}>
              <BoardOrientationSelector
                label={t("records.filters.boardOrientation")}
                value={(keyFilter ?? "white") as BoardOrientation}
                onChange={dashboard.setKey}
                // records.keys.{white,black,random}
                formatOption={(o) => t(`records.keys.${o}`)}
              />
            </View>
          </ListSection>
        ) : null}
        {selectedMenu && PIECE_FILTER_MENUS.has(selectedMenu) ? (
          <ListSection>
            <View style={styles.panelBody}>
              <PieceSelector
                label={t("records.filters.piece")}
                options={LEGAL_MOVES_PIECE_SELECTIONS}
                value={keyFilter ?? "random"}
                onChange={dashboard.setKey}
                pieceOf={(piece) => PIECE_OF[piece] ?? null}
                // records.keys.{king,queen,rook,bishop,knight,random}
                formatOption={(piece) => t(`records.keys.${piece}`)}
              />
            </View>
          </ListSection>
        ) : null}

        {failed ? (
          <Text style={[styles.note, { color: colors.destructive }]}>
            {t("records.loadFailed")}
          </Text>
        ) : null}

        <View style={loading && styles.stale}>
          <RecordStats
            bestLabel={t("records.bestScore")}
            averageLabel={t("records.avgScore")}
            best={{
              value: dashboard.stats.bestScore,
              change: dashboard.bestScoreChange,
            }}
            average={{
              value: dashboard.stats.avgCompletionScore,
              change: dashboard.avgScoreChange,
            }}
            // records.comparison.{vsLastWeek,vs2WeeksAgo,vsLastMonth,vs2MonthsAgo}
            comparisonLabel={t(
              `records.comparison.${getComparisonLabelKey(period)}`,
            )}
          />
        </View>

        <ListSection
          title={t("records.scoreTrend")}
          style={loading && styles.stale}
        >
          <View style={styles.panelBody}>
            <ScoreChart
              data={dashboard.chartData}
              emptyMessage={t("records.noData")}
              currentLabel={periodLabel}
              previousLabel={previousLabel}
              accessibilityLabel={t("records.chartLabel", {
                current: periodLabel,
                previous: previousLabel,
              })}
              onPreviousLabelPress={
                navigablePrevious
                  ? () => dashboard.setPeriod(navigablePrevious)
                  : undefined
              }
            />
          </View>
        </ListSection>

        <ListSection
          title={t("records.sessionHistory")}
          style={loading && styles.stale}
        >
          {dashboard.history.length === 0 ? (
            <ListRow title={t("records.noData")} />
          ) : (
            [
              <RecordColumnsHeader key="header" />,
              ...dashboard.history.map((record) => (
                <RecordRow key={record.id} record={record} locale={locale} />
              )),
            ]
          )}
          {dashboard.hasMoreResults ? (
            <ListRow
              title={t("records.viewAllResults")}
              onPress={() =>
                router.push({
                  pathname: "/records-results",
                  params: {
                    menu: selectedMenu ?? "",
                    key: keyFilter ?? "",
                  },
                })
              }
              testID="records-view-all"
            />
          ) : null}
        </ListSection>

        {selectedMenu && practiceModuleOf(selectedMenu) ? (
          <Button
            title={t("records.takeChallenge")}
            icon="play"
            size="lg"
            fullWidth
            onPress={openChallenge}
            testID="records-take-challenge"
          />
        ) : null}
      </>
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await dashboard.refresh();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.chips}>
        <FilterChips
          options={DASHBOARD_PERIODS.map((p) => ({
            value: p,
            label: t(`records.periods.${p}`),
          }))}
          selected={period}
          onSelect={(value) => {
            const next = DASHBOARD_PERIODS.find((p) => p === value);
            if (next) dashboard.setPeriod(next);
          }}
          accessibilityLabel={t("records.period")}
          testID="records-period"
        />
      </View>
      {body()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  chips: {
    marginHorizontal: -spacing.md,
  },
  panelBody: {
    padding: spacing.md,
  },
  /** The previous answer, while the next period or challenge loads. */
  stale: {
    opacity: 0.5,
  },
  note: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  empty: {
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
