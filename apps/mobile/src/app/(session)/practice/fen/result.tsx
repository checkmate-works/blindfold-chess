import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { PracticeResultScreen } from "../../../../components";
import { SessionResult } from "../../../../features/fen/components";
import { RelatedArticlesSection } from "../../../../features/learn/RequiredKnowledgeSection";
import { FEN_ARTICLES } from "../../../../features/fen/lib/related-articles";
import {
  parseFenResultParams,
  type FenResultParams,
} from "../../../../features/fen/lib/route-params";
import { spacing } from "../../../../theme";

/**
 * The FEN drill's result, as the web's: the run's accuracy and recreation
 * progress, every problem with both boards, then the FEN article the web
 * offers under "Related Learning".
 */
export default function FenResult() {
  const params = useLocalSearchParams<FenResultParams>();
  const result = parseFenResultParams(params);

  return (
    <PracticeResultScreen setupHref="/practice/fen">
      <View style={styles.stack}>
        <SessionResult result={result} />
        <RelatedArticlesSection slugs={FEN_ARTICLES} />
      </View>
    </PracticeResultScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
});
