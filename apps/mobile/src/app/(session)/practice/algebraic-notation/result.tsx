import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import { getScorePercentage } from "@blindfold-chess/features/algebraic-notation";

import {
  PracticeResultCard,
  PracticeResultScreen,
} from "../../../../components";
import { RequiredKnowledgeSection } from "../../../../features/learn/RequiredKnowledgeSection";
import { parseIntParam } from "../../../../lib/route-params";
import { spacing } from "../../../../theme";

/**
 * The web's free-play result: the score and accuracy, then the article the
 * exercise builds on ("Related Learning" on the web). Score and accuracy
 * only: the quiz is untimed, so the time stats the other modules show (via
 * `PracticeStatsResultCard`) do not exist here, and nothing is recorded,
 * so there is no record status either.
 */
export default function AlgebraicNotationResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ score: string; total: string }>();
  const total = parseIntParam(params.total, { fallback: 0 });
  const score = Math.min(parseIntParam(params.score, { fallback: 0 }), total);

  return (
    <PracticeResultScreen setupHref="/practice/algebraic-notation">
      <View style={styles.stack}>
        <PracticeResultCard
          scoreLabel={t("practiceResult.correctAnswers")}
          scoreValue={`${score} / ${total}`}
          statItems={[
            {
              label: t("practiceResult.accuracy"),
              value: `${getScorePercentage(score, total)}%`,
            },
          ]}
        />
        <RequiredKnowledgeSection
          slugs={["algebraic-notation"]}
          title={t("practice.relatedArticles")}
        />
      </View>
    </PracticeResultScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
});
