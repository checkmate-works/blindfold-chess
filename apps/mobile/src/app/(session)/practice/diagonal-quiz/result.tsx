import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  PracticeResultScreen,
  PracticeStatsResultCard,
} from "../../../../components";
import { ChallengeRecordStatus } from "../../../../features/challenge/ChallengeRecordStatus";
import { DiagonalProblemList } from "../../../../features/diagonal-quiz/components";
import { parseQuestionResults } from "../../../../features/diagonal-quiz/lib/result-params";
import { parsePracticeStatsParams } from "../../../../lib/practice-result-params";
import type { PracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";

export default function DiagonalQuizResult() {
  const params = useLocalSearchParams<
    PracticeStatsParams & { attemptId?: string; data?: string }
  >();
  const result = parsePracticeStatsParams(params);
  const questions = parseQuestionResults(params.data);

  return (
    <PracticeResultScreen setupHref="/practice/diagonal-quiz">
      <PracticeStatsResultCard result={result} />
      <ChallengeRecordStatus
        attemptId={params.attemptId}
        menu="diagonal_quiz"
      />
      {questions.length > 0 && (
        <View style={styles.problems}>
          <DiagonalProblemList results={questions} />
        </View>
      )}
    </PracticeResultScreen>
  );
}

const styles = StyleSheet.create({
  // The web's `mt-8` above the list.
  problems: {
    marginTop: spacing.xl,
  },
});
