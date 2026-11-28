import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { ChallengeRecordStatus } from "../../../../features/challenge/ChallengeRecordStatus";
import { RelatedArticlesSection } from "../../../../features/learn/RequiredKnowledgeSection";
import {
  ProblemList,
  RELATED_ARTICLE_PIECES,
  RELATED_ARTICLES,
} from "../../../../features/route-planner/components";
import {
  parseRoutePlannerProblems,
  type RoutePlannerResultParams,
} from "../../../../features/route-planner/lib/result-params";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";

/**
 * The challenge's result, as the web's: the shared stats, whether the run
 * was recorded, every problem with its route on a board, then the
 * movement articles behind the drill.
 */
export default function RoutePlannerResult() {
  const params = useLocalSearchParams<
    Partial<RoutePlannerResultParams> & {
      attemptId?: string;
      interrupted?: string;
    }
  >();
  const result = parsePracticeStatsParams(params);
  const problems = parseRoutePlannerProblems(params.problems);

  return (
    <PracticeResultScreen setupHref="/practice/route-planner">
      <View style={styles.stack}>
        <View>
          <PracticeStatsResultCard result={result} />
          <ChallengeRecordStatus
            attemptId={params.attemptId}
            interrupted={params.interrupted === "1"}
          />
        </View>
        <ProblemList problems={problems} />
        <RelatedArticlesSection
          slugs={RELATED_ARTICLES}
          pieces={RELATED_ARTICLE_PIECES}
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
