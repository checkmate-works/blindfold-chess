import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { ListSection } from "./List";
import {
  initiallyOpenRows,
  verdictPresentation,
  type ProblemVerdict,
  type VerdictTone,
} from "./problem-details";
import { fontSize, fontWeight, spacing, useTheme, withAlpha } from "../theme";

/** Padding around an open row's content: the web's `p-4`. */
const DETAILS_PADDING = spacing.md;

/**
 * The width an open row takes off its content, on top of the screen's own
 * padding: the panel's border on both sides plus the open row's padding.
 * A module that sizes a board from the window width (rather than from its
 * container) subtracts this so the board fits inside the row.
 */
export const PROBLEM_DETAILS_INSET = 2 + DETAILS_PADDING * 2;

type ProblemDetailsListProps<Problem> = {
  problems: readonly Problem[];
  /** How the problem ended; `problemVerdict` folds a module's flags into it. */
  verdictOf: (problem: Problem) => ProblemVerdict;
  /** What follows "No.N" on the row: the square, the route asked, … */
  renderSubtitle: (problem: Problem, index: number) => ReactNode;
  /** The open row's content. Rendered only while the row is open. */
  renderDetails: (problem: Problem, index: number) => ReactNode;
  /** Prefix for each row's `testID`, which ends in the row's index. */
  rowTestIDPrefix?: string;
};

/**
 * The web result's "Problem Details" under a challenge: one row per problem,
 * "No.N", the module's subtitle and the verdict, each opening onto what the
 * module shows for it.
 *
 * Every module's list behaves the same way, so the parts that make it behave
 * live here: the section, the row, the verdict and its colour, and which
 * rows are open. Rows open independently, because a reader comparing two
 * misses must not lose the first by opening the second. The rows that were
 * not answered right start open (`initiallyOpenRows`), since they are what
 * the result is read for. A module supplies only what differs per problem.
 *
 * Renders nothing for an empty list, so a screen need not guard it.
 */
export function ProblemDetailsList<Problem>({
  problems,
  verdictOf,
  renderSubtitle,
  renderDetails,
  rowTestIDPrefix,
}: ProblemDetailsListProps<Problem>) {
  const { t } = useTranslation();
  const { open, toggle } = useOpenRowSet(() =>
    initiallyOpenRows(problems.map(verdictOf)),
  );
  if (problems.length === 0) return null;

  return (
    <ListSection title={t("practiceResult.problemDetails")}>
      {problems.map((problem, index) => (
        <ProblemRow
          key={index}
          index={index}
          verdict={verdictOf(problem)}
          subtitle={renderSubtitle(problem, index)}
          expanded={open.has(index)}
          onToggle={toggle}
          testID={
            rowTestIDPrefix === undefined
              ? undefined
              : `${rowTestIDPrefix}${index}`
          }
        >
          {open.has(index) ? renderDetails(problem, index) : null}
        </ProblemRow>
      ))}
    </ListSection>
  );
}

/**
 * The indexes of the open rows, each toggled on its own. The initial set is
 * read once, on mount: a result screen's problems never change under it,
 * and re-deriving it later would close rows the reader opened.
 */
function useOpenRowSet(initial: () => ReadonlySet<number>) {
  const [open, setOpen] = useState(initial);
  const toggle = useCallback((index: number) => {
    setOpen((previous) => {
      const next = new Set(previous);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }, []);
  return { open, toggle };
}

function ProblemRow({
  index,
  verdict,
  subtitle,
  expanded,
  onToggle,
  testID,
  children,
}: {
  index: number;
  verdict: ProblemVerdict;
  subtitle: ReactNode;
  expanded: boolean;
  onToggle: (index: number) => void;
  testID?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View>
      <Pressable
        onPress={() => onToggle(index)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: withAlpha(colors.muted, 0.5) },
        ]}
        testID={testID}
      >
        <View style={styles.lead}>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={12}
            color={colors.mutedForeground}
          />
          <Text style={[styles.number, { color: colors.foreground }]}>
            No.{index + 1}
          </Text>
          {subtitle}
        </View>
        <VerdictBadge verdict={verdict} />
      </Pressable>
      {expanded && (
        <View
          style={[
            styles.details,
            {
              backgroundColor: withAlpha(colors.muted, 0.3),
              borderTopColor: colors.border,
            },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

function VerdictBadge({ verdict }: { verdict: ProblemVerdict }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { label, tone, clock } = verdictPresentation(verdict);
  const toneColors: Record<VerdictTone, string> = {
    success: colors.success,
    destructive: colors.destructive,
    muted: colors.mutedForeground,
  };
  const color = toneColors[tone];

  return (
    <View style={styles.verdict}>
      {clock && <Ionicons name="time-outline" size={12} color={color} />}
      <Text style={[styles.verdictText, { color }]}>
        {"text" in label ? label.text : t(label.key)}
      </Text>
    </View>
  );
}

/**
 * The web's `p-3` row with its `gap-2` lead, the `font-medium` number, the
 * `text-sm font-bold` verdict, and the open row's `p-4 bg-muted/30
 * border-t`. The row's sides take the list panel's 16 instead of `p-3`, so
 * it lines up with the section caption and the other grouped panels.
 */
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  lead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  number: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
  },
  verdict: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  verdictText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.bold,
  },
  details: {
    padding: DETAILS_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
