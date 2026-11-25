import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { RelatedArticlesSection } from "../../../../features/learn/RequiredKnowledgeSection";
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
  const params = useLocalSearchParams<PracticeStatsParams>();
  const result = parsePracticeStatsParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/quadrants">
      <View style={styles.stack}>
        <PracticeStatsResultCard result={result} hideAverageTime />
        <RelatedArticlesSection slugs={RELATED_ARTICLES} />
      </View>
    </PracticeResultScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
});
