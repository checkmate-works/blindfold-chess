import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { RequiredKnowledgeSection } from "../../../../features/learn/RequiredKnowledgeSection";
import { RELATED_ARTICLES } from "../../../../features/quadrants/components";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";

/**
 * The challenge's result, as the web's: the shared stats without the
 * average time per answer (the web leaves it out here), then the article
 * behind the drill. Nothing is recorded, so there is no record status.
 */
export default function QuadrantsResult() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/quadrants">
      <View style={styles.stack}>
        <PracticeStatsResultCard result={result} hideAverageTime />
        <RequiredKnowledgeSection
          slugs={RELATED_ARTICLES}
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
