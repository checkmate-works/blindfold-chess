import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  type ChallengeRecord,
  formatDate,
} from "@blindfold-chess/features/challenge-records";
import { MISTAKE_LIMIT } from "@blindfold-chess/features/practice-registry";

import { ListRow } from "../../components";
import {
  type AppColors,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";

/**
 * The colour of a run's miss count, as the web's `getMissColorClass`: red
 * for a run that ended on the mistake limit, green for a clean one.
 */
function missColor(incorrect: number, colors: AppColors): string {
  if (incorrect >= MISTAKE_LIMIT) return colors.destructive;
  if (incorrect === 0) return colors.success;
  return colors.foreground;
}

type Props = {
  record: ChallengeRecord;
  locale: string;
  /** The challenge's name, for a list that mixes challenges. */
  menuName?: string;
};

/**
 * One run in a list: when it was played (and which challenge, where the
 * list mixes them), then its correct answers and misses — a row of the
 * web's session history table. The two counts sit in fixed columns at the
 * row's end so they line up from row to row like the table's.
 */
export function RecordRow({ record, locale, menuName }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const date = formatDate(record.createdAt, locale);
  const counts = t("records.sessionRow", {
    correct: record.score,
    incorrect: record.incorrectAnswers,
  });
  return (
    <ListRow
      title={date}
      subtitle={menuName}
      accessibilityLabel={[date, menuName, counts].filter(Boolean).join(", ")}
      trailing={
        <View style={styles.counts}>
          <Text style={[styles.score, { color: colors.foreground }]}>
            {record.score}
          </Text>
          <Text
            style={[
              styles.miss,
              { color: missColor(record.incorrectAnswers, colors) },
            ]}
          >
            {record.incorrectAnswers}
          </Text>
        </View>
      }
    />
  );
}

/**
 * The column names over `RecordRow`'s two counts, the table header of the
 * web's history ("Correct", "Miss"), aligned with the counts below.
 */
export function RecordColumnsHeader() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [correct, miss] = [
    t("records.columns.correct"),
    t("records.columns.miss"),
  ];
  return (
    <View
      style={styles.header}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={[
          styles.headerText,
          styles.score,
          { color: colors.mutedForeground },
        ]}
      >
        {correct}
      </Text>
      <Text
        style={[
          styles.headerText,
          styles.miss,
          { color: colors.mutedForeground },
        ]}
      >
        {miss}
      </Text>
    </View>
  );
}

const COLUMN_WIDTH = 52;

const styles = StyleSheet.create({
  counts: {
    flexDirection: "row",
  },
  score: {
    width: COLUMN_WIDTH,
    textAlign: "right",
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  miss: {
    width: COLUMN_WIDTH,
    textAlign: "right",
    fontSize: fontSize.md,
    fontVariant: ["tabular-nums"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
