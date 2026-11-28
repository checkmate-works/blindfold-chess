import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  type ChallengeRecord,
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
} from "@blindfold-chess/features/challenge-records";
import { LEGAL_MOVES_PIECE_SELECTIONS } from "@blindfold-chess/features/legal-moves";
import {
  CHALLENGE_MENU_TYPES,
  type ChallengeMenuType,
} from "@blindfold-chess/features/practice-registry";

import { FilterChips, ListRow, ListSection } from "../components";
import { RecordColumnsHeader, RecordRow } from "../features/records/RecordRow";
import { menuNameOf } from "../features/records/menu-name";
import { fetchRecordsResults } from "../features/records/records-api";
import { fontSize, spacing, useTheme } from "../theme";

const ALL = "all";
const ORIENTATION_KEYS = ["white", "black", "random"] as const;
/** How near the end, in points, the next page starts loading. */
const END_REACHED_DISTANCE = 300;

function keysOf(menu: ChallengeMenuType | null): readonly string[] {
  if (menu && ORIENTATION_FILTER_MENUS.has(menu)) return ORIENTATION_KEYS;
  if (menu && PIECE_FILTER_MENUS.has(menu)) return LEGAL_MOVES_PIECE_SELECTIONS;
  return [];
}

type State = {
  items: ChallengeRecord[];
  page: number;
  totalPages: number;
};

/**
 * Every challenge result, newest first (the web's
 * `/mypage/challenges/results`), opened from My Records' "More results"
 * with its challenge and key.
 *
 * @description
 * The web's menu select becomes a row of filter chips ("All" first, then
 * every challenge played), and a keyed challenge gets a second row for its
 * key; as on the web, a keyed challenge always lists one key, the newest
 * one played when none was picked. The web's numbered pages become one list
 * that loads the next page as it nears the end. A row says which challenge
 * the run was when the list mixes them.
 */
export default function RecordsResultsScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const locale = i18n.language;
  const params = useLocalSearchParams<{ menu?: string; key?: string }>();
  const [menu, setMenu] = useState<ChallengeMenuType | null>(
    CHALLENGE_MENU_TYPES.find((m) => m === params.menu) ?? null,
  );
  const [key, setKey] = useState<string | null>(params.key || null);
  const [menus, setMenus] = useState<ChallengeMenuType[]>([]);
  const [state, setState] = useState<State | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The filters the shown list belongs to. A response for other filters
  // (a slow page of the previous selection) is dropped.
  const filterId = `${menu ?? ""}:${key ?? ""}`;
  const currentFilter = useRef(filterId);
  currentFilter.current = filterId;

  const loadPage = useCallback(
    async (page: number) => {
      const requested = `${menu ?? ""}:${key ?? ""}`;
      const result = await fetchRecordsResults({ page, menu, key });
      if (currentFilter.current !== requested) return;
      if ("error" in result) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setMenus(result.availableMenuTypes);
      // A keyed challenge asked without a key answers with the key it
      // listed; adopt it so the chips show it. Setting it changes the
      // filter, so this answer is dropped and the same list is asked
      // again under its key.
      if (result.key !== key && result.menu === menu) {
        setKey(result.key);
        return;
      }
      setState((prev) => ({
        items:
          page === 1 || !prev ? result.items : [...prev.items, ...result.items],
        page: result.page,
        totalPages: result.totalPages,
      }));
    },
    [menu, key],
  );

  useEffect(() => {
    setState(null);
    void loadPage(1);
  }, [loadPage]);

  // A ref, not the state: scroll events arrive faster than a render, and
  // each would otherwise ask for the same next page again.
  const loadingMoreRef = useRef(false);
  const loadMore = async () => {
    if (!state || loadingMoreRef.current || state.page >= state.totalPages) {
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await loadPage(state.page + 1);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  };

  const keys = keysOf(menu);
  const header = (
    <View style={styles.filters}>
      <View style={styles.chips}>
        <FilterChips
          options={[
            { value: ALL, label: t("records.results.allMenus") },
            ...menus.map((m) => ({ value: m, label: menuNameOf(m, t) })),
          ]}
          selected={menu ?? ALL}
          onSelect={(value) => {
            setMenu(CHALLENGE_MENU_TYPES.find((m) => m === value) ?? null);
            setKey(null);
          }}
          accessibilityLabel={t("records.menu")}
          testID="records-results-menu"
        />
      </View>
      {keys.length > 0 ? (
        <View style={styles.chips}>
          <FilterChips
            // records.keys.{white,black,random,king,queen,rook,bishop,knight}
            options={keys.map((k) => ({
              value: k,
              label: t(`records.keys.${k}`),
            }))}
            selected={key ?? ""}
            onSelect={setKey}
            accessibilityLabel={
              menu && ORIENTATION_FILTER_MENUS.has(menu)
                ? t("records.filters.boardOrientation")
                : t("records.filters.piece")
            }
            testID="records-results-key"
          />
        </View>
      ) : null}
    </View>
  );

  const body = () => {
    if (state === null) {
      return (
        <ListSection>
          <ListRow
            title={failed ? t("records.loadFailed") : t("records.loading")}
          />
        </ListSection>
      );
    }
    if (state.items.length === 0) {
      return (
        <ListSection>
          <ListRow title={t("records.results.empty")} />
        </ListSection>
      );
    }
    return (
      <ListSection title={t("records.results.title")}>
        <RecordColumnsHeader />
        {state.items.map((record) => (
          <RecordRow
            key={record.id}
            record={record}
            locale={locale}
            menuName={menu ? undefined : menuNameOf(record.menuType, t)}
          />
        ))}
      </ListSection>
    );
  };

  const reachedEnd = state !== null && state.page >= state.totalPages;

  return (
    // A ScrollView rather than a FlatList: the rows sit inside one grouped
    // panel (`ListSection`), and a page is 20 rows, so there is nothing to
    // virtualise. The next page is asked for as the end comes near.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      scrollEventThrottle={200}
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const fromEnd =
          contentSize.height - layoutMeasurement.height - contentOffset.y;
        if (fromEnd < END_REACHED_DISTANCE) void loadMore();
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadPage(1);
            setRefreshing(false);
          }}
        />
      }
    >
      {header}
      {body()}
      {loadingMore ? (
        <ActivityIndicator style={styles.footer} />
      ) : reachedEnd && state.items.length > 0 ? (
        <Text style={[styles.end, { color: colors.mutedForeground }]}>
          {t("records.results.end")}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  filters: {
    gap: spacing.sm,
  },
  chips: {
    marginHorizontal: -spacing.md,
  },
  footer: {
    paddingVertical: spacing.md,
  },
  end: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
