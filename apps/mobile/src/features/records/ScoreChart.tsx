import { useState } from "react";
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import type { ChartDataPoint } from "@blindfold-chess/features/challenge-records";

import { fontSize, fontWeight, spacing, useTheme } from "../../theme";

const CHART_HEIGHT = 180;
/** Room for the y-axis numbers on the left, and for the last dot on the right. */
const PAD_LEFT = 28;
const PAD_RIGHT = 10;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
/** Horizontal grid lines, counting the baseline. */
const Y_TICKS = 4;
/** At most this many x-axis labels; the rest are skipped evenly. */
const MAX_X_LABELS = 7;

type Props = {
  data: ChartDataPoint[];
  emptyMessage: string;
  currentLabel: string;
  previousLabel: string;
  /** Read out for the chart as a whole. */
  accessibilityLabel: string;
  /** Opens the previous period, when it is one the dashboard offers. */
  onPreviousLabelPress?: () => void;
};

/** A ceiling for the y axis that divides into `Y_TICKS - 1` whole steps. */
function niceMax(value: number): number {
  const steps = Y_TICKS - 1;
  return Math.max(steps, Math.ceil(value / steps) * steps);
}

/**
 * The score trend: this period's daily average as a solid line, the period
 * before as a dashed grey one under it, overlaid day by day — the web's
 * Recharts line chart, drawn with SVG.
 *
 * The web shows a value in a tooltip under the pointer. A phone has no
 * hover, so a tap on the chart picks the nearest day and its values show
 * in a line above the plot until another day is tapped. The legend's
 * previous-period entry opens that period, as on the web.
 */
export function ScoreChart({
  data,
  emptyMessage,
  currentLabel,
  previousLabel,
  accessibilityLabel,
  onPreviousLabelPress,
}: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const hasPrevious = data.some((d) => d.previousScore !== null);
  const values = data.flatMap((d) =>
    [d.score, d.previousScore].filter((v): v is number => v !== null),
  );
  const yMax = niceMax(Math.max(...values));
  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xOf = (i: number) =>
    PAD_LEFT +
    (data.length === 1 ? plotWidth / 2 : (plotWidth * i) / (data.length - 1));
  const yOf = (v: number) => PAD_TOP + plotHeight * (1 - v / yMax);

  // Nulls are skipped and the line runs on between the days that have a
  // value (Recharts' `connectNulls`, which the web sets).
  const pointsOf = (pick: (d: ChartDataPoint) => number | null) =>
    data.flatMap((d, i) => {
      const v = pick(d);
      return v === null ? [] : [{ i, x: xOf(i), y: yOf(v) }];
    });
  const current = pointsOf((d) => d.score);
  const previous = pointsOf((d) => d.previousScore);
  const asPolyline = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  const labelEvery = Math.ceil(data.length / MAX_X_LABELS);
  const ticks = Array.from(
    { length: Y_TICKS },
    (_, k) => (yMax * k) / (Y_TICKS - 1),
  );

  const pick = (event: GestureResponderEvent) => {
    if (plotWidth <= 0) return;
    const x = event.nativeEvent.locationX - PAD_LEFT;
    const ratio = data.length === 1 ? 0 : x / plotWidth;
    const index = Math.round(ratio * (data.length - 1));
    setSelected(Math.min(data.length - 1, Math.max(0, index)));
  };

  const point = selected !== null ? data[selected] : undefined;
  const format = (v: number | null) => (v === null ? "-" : v.toFixed(1));

  return (
    <View style={styles.container}>
      <Text
        style={[styles.readout, { color: colors.mutedForeground }]}
        numberOfLines={1}
      >
        {point
          ? `${point.date}  ${currentLabel} ${format(point.score)}` +
            (hasPrevious
              ? `  ${previousLabel} ${format(point.previousScore)}`
              : "")
          : " "}
      </Text>
      <Pressable
        onPress={pick}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ height: CHART_HEIGHT }}
      >
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            {ticks.map((tick) => (
              <Line
                key={tick}
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke={colors.rowSeparator}
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : "3 3"}
              />
            ))}
            {point && selected !== null ? (
              <Line
                x1={xOf(selected)}
                x2={xOf(selected)}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke={colors.panelBorder}
                strokeWidth={1}
              />
            ) : null}
            {previous.length > 1 ? (
              <Polyline
                points={asPolyline(previous)}
                fill="none"
                stroke={colors.mutedForeground}
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
            ) : null}
            {previous.map((p) => (
              <Circle
                key={`p${p.i}`}
                cx={p.x}
                cy={p.y}
                r={selected === p.i ? 4 : 2}
                fill={colors.mutedForeground}
              />
            ))}
            {current.length > 1 ? (
              <Polyline
                points={asPolyline(current)}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
              />
            ) : null}
            {current.map((p) => (
              <Circle
                key={`c${p.i}`}
                cx={p.x}
                cy={p.y}
                r={selected === p.i ? 5 : 3}
                fill={colors.primary}
              />
            ))}
          </Svg>
        ) : null}
        {/* The axis numbers and day names are Text over the plot, so they
            follow the app's font and its text scaling. */}
        {width > 0
          ? ticks.map((tick) => (
              <Text
                key={`y${tick}`}
                style={[
                  styles.yLabel,
                  { top: yOf(tick) - 7, color: colors.mutedForeground },
                ]}
              >
                {Number.isInteger(tick) ? tick : tick.toFixed(1)}
              </Text>
            ))
          : null}
        {width > 0
          ? data.map((d, i) =>
              i % labelEvery === 0 ? (
                <Text
                  key={`x${i}`}
                  numberOfLines={1}
                  style={[
                    styles.xLabel,
                    { left: xOf(i) - 24, color: colors.mutedForeground },
                  ]}
                >
                  {d.date}
                </Text>
              ) : null,
            )
          : null}
      </Pressable>
      {hasPrevious ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendSwatch, { backgroundColor: colors.primary }]}
            />
            <Text style={[styles.legendText, { color: colors.foreground }]}>
              {currentLabel}
            </Text>
          </View>
          <Pressable
            onPress={onPreviousLabelPress}
            disabled={!onPreviousLabelPress}
            accessibilityRole={onPreviousLabelPress ? "button" : undefined}
            hitSlop={12}
            style={styles.legendItem}
          >
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors.mutedForeground },
              ]}
            />
            <Text
              style={[
                styles.legendText,
                {
                  color: onPreviousLabelPress
                    ? colors.primary
                    : colors.foreground,
                },
              ]}
            >
              {previousLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  empty: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: fontSize.sm,
  },
  readout: {
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
  },
  yLabel: {
    position: "absolute",
    left: 0,
    width: PAD_LEFT - 6,
    textAlign: "right",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  xLabel: {
    position: "absolute",
    bottom: 0,
    width: 48,
    textAlign: "center",
    fontSize: 11,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 12,
    height: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
