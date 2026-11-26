import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  BottomBar,
  Button,
  ListIcon,
  ListRow,
  ListSection,
  Screen,
} from "../../../components";
import { examFor } from "../../../features/dojo/exams";
import { RankGoalCard } from "../../../features/dojo/RankGoalCard";
import { usePassedExams } from "../../../features/dojo/passed-exams";
import { serializeFenSessionParams } from "../../../features/fen/lib/route-params";
import { fontSize, spacing, useTheme } from "../../../theme";

/**
 * Dojo exam (道場の課題)
 *
 * @description
 * The app's exam for a rank whose web requirement it leaves out (2kyu:
 * solve position-memory problems instead of posting one). Says what the
 * rank certifies and how the exam is passed, then starts the
 * position-memory session on the exam's fixed positions in order. The
 * result screen grades the run and records a pass on the device
 * (`ExamVerdictCard`); "Play again" there returns here.
 *
 * @flow
 * 1. Opened from the rank's exam requirement in the dojo or on the home tab
 * 2. Start → memorize and recreate each position
 * 3. The result says pass or fail; a pass raises the dojo's rank
 */
export default function DojoExamScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { rank } = useLocalSearchParams<{ rank: string }>();
  const passed = usePassedExams();
  const exam = typeof rank === "string" ? examFor(rank) : undefined;
  if (!exam) return null;
  const rankName = t(`ranks.names.${exam.rank}`);

  const start = () =>
    router.push({
      pathname: "/practice/position-memory/session",
      params: {
        ...serializeFenSessionParams({
          fens: exam.fens,
          problemCount: exam.fens.length,
          shuffle: false,
        }),
        seconds: String(exam.memorizeSeconds),
        exam: exam.rank,
      },
    });

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{ title: t("dojo.exam.title", { rank: rankName }) }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <RankGoalCard
          slug={exam.rank}
          standing={passed.has(exam.rank) ? "achieved" : undefined}
        />
        <ListSection title={t("dojo.exam.howTitle")}>
          <ListRow
            leading={<ListIcon ionicon="eye-outline" />}
            title={t("dojo.exam.stepMemorize", {
              count: exam.fens.length,
              seconds: exam.memorizeSeconds,
            })}
          />
          <ListRow
            leading={<ListIcon ionicon="grid-outline" />}
            title={t("dojo.exam.stepRecreate")}
          />
          <ListRow
            leading={<ListIcon ionicon="ribbon-outline" />}
            title={t("dojo.exam.rule", {
              count: exam.fens.length,
              accuracy: exam.minAccuracy,
            })}
          />
        </ListSection>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          {t("dojo.exam.deviceNote")}
        </Text>
      </ScrollView>
      <BottomBar>
        <Button
          title={t("dojo.exam.start")}
          icon="play"
          size="lg"
          onPress={start}
          testID="exam-start"
        />
      </BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  note: {
    fontSize: fontSize.xs,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
