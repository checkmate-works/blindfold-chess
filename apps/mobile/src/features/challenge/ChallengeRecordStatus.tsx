import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme, borderRadius, fontSize, spacing } from "../../theme";
import { refreshAccount, useAuth as useAuthState } from "../../auth/use-auth";
import { rankLabel } from "../records/rank-label";
import { markGuestAttempt } from "../dojo/progress-store";
import { finishChallenge, type ChallengeResultSummary } from "./challenge-api";
import { ChallengeSignInRow } from "./ChallengeSignInRow";
import { ExpGainCard } from "./ExpGainCard";
import { RecordCard } from "./RecordCard";
import { takeSignedOutRunKey } from "./useChallengeAttempt";

type Status = "saving" | "recorded" | "notRecorded" | "failed" | "interrupted";

/**
 * The result screen's line about the leaderboard: for a recorded run it
 * finishes the attempt on the server (once) and says whether the score was
 * recorded; for an unrecorded run by a signed-out player it invites them to
 * sign in, as the web's result page does, with the setup screen's sign-in
 * row (`ChallengeSignInRow`) so the invitation looks the same before and
 * after a run.
 *
 * A recorded run then shows what the web's result page shows of it, in the
 * web's order: the EXP card, then the player's record against it with the
 * way into My Records (`summary` of the finish). When the server could not
 * read those, the line saying the score was recorded stands in for them.
 *
 * A run that ended because its answers stopped reaching the server
 * (`interrupted`, see `attempt-result-params.ts`) is not finished; the line
 * says the connection was lost and nothing was recorded.
 */
export function ChallengeRecordStatus({
  attemptId,
  interrupted = false,
}: {
  attemptId: string | undefined;
  interrupted?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const auth = useAuthState();
  const [status, setStatus] = useState<Status>(
    interrupted ? "interrupted" : "saving",
  );
  const [promoted, setPromoted] = useState<string[]>([]);
  const [summary, setSummary] = useState<ChallengeResultSummary | null>(null);

  // A signed-out run that reached its result marks its challenge as
  // practised on this device. The dojo's "practice" stage asks, per
  // `challenge_score` requirement, whether the player has finished that
  // challenge at least once, counted per `(menuType, leaderboardKey)` — the
  // unit the server's best scores are kept in, so a signed-in player's
  // `challenge_best_scores` rows answer the same question without anything
  // new being stored. A signed-out run never reaches the server, so the
  // device keeps the mark instead.
  const signedOut =
    auth.status === "signedOut" || auth.status === "unavailable";
  useEffect(() => {
    if (attemptId || !signedOut) return;
    const key = takeSignedOutRunKey();
    if (key) void markGuestAttempt(key);
  }, [attemptId, signedOut]);

  useEffect(() => {
    if (!attemptId || interrupted) return;
    let cancelled = false;
    void finishChallenge(attemptId).then((result) => {
      if (cancelled) return;
      setStatus(result.kind);
      if (result.kind === "recorded") {
        setPromoted(result.grantedRanks.map((rank) => rank.slug));
        setSummary(result.summary);
        // The EXP and any new rank show on the home tab's progress card.
        void refreshAccount();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId, interrupted]);

  if (!attemptId) {
    if (auth.status !== "signedOut") return null;
    return (
      <View style={styles.signInRow}>
        <ChallengeSignInRow />
      </View>
    );
  }

  if (status === "recorded" && summary) {
    return (
      <View style={styles.cards}>
        {summary.exp && <ExpGainCard exp={summary.exp} />}
        {promoted.length > 0 && (
          <View
            style={[
              styles.box,
              styles.promotedBox,
              { backgroundColor: colors.card },
            ]}
            accessibilityLiveRegion="polite"
          >
            <PromotedLines slugs={promoted} />
          </View>
        )}
        <RecordCard record={summary.record} menuType={summary.menuType} />
      </View>
    );
  }

  // challenge.record.{saving,recorded,notRecorded,failed,interrupted}
  const color =
    status === "recorded"
      ? feedbackColors.success
      : status === "saving"
        ? colors.mutedForeground
        : feedbackColors.error;
  return (
    <View
      style={[
        styles.box,
        promoted.length === 0 && styles.row,
        { backgroundColor: colors.card },
      ]}
      accessibilityLiveRegion="polite"
    >
      {status === "saving" && <ActivityIndicator color={colors.primary} />}
      <Text style={[styles.text, { color }]}>
        {t(`challenge.record.${status}`)}
      </Text>
      <PromotedLines slugs={promoted} />
    </View>
  );
}

/** "Promoted to <rank>!" for each rank the run granted. */
function PromotedLines({ slugs }: { slugs: string[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return slugs.map((slug) => (
    <Text key={slug} style={[styles.promoted, { color: colors.foreground }]}>
      {t("challenge.promoted", { rank: rankLabel(slug, t) })}
    </Text>
  ));
}

const styles = StyleSheet.create({
  box: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.md,
  },
  cards: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  promotedBox: {
    marginTop: 0,
  },
  signInRow: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  text: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  promoted: {
    fontSize: fontSize.md,
    fontWeight: "700",
    textAlign: "center",
  },
});
