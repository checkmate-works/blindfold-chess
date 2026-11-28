import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ChallengeMenuType } from "@blindfold-chess/features/practice-registry";

import { Button } from "../../components/Button";
import { useTheme, borderRadius, fontSize, spacing } from "../../theme";
import { refreshAccount, useAuth as useAuthState } from "../../auth/use-auth";
import { rankLabel } from "../records/rank-label";
import { markGuestAttempt } from "../dojo/progress-store";
import { finishChallenge } from "./challenge-api";
import { ChallengeSignInRow } from "./ChallengeSignInRow";
import { takeSignedOutRunKey } from "./useChallengeAttempt";

type Status = "saving" | "recorded" | "notRecorded" | "failed";

/**
 * The result screen's line about the leaderboard: for a recorded run it
 * finishes the attempt on the server (once) and says whether the score was
 * recorded; for an unrecorded run by a signed-out player it invites them to
 * sign in, as the web's result page does, with the setup screen's sign-in
 * row (`ChallengeSignInRow`) so the invitation looks the same before and
 * after a run.
 *
 * A recorded run ends with a button into My Records, opened on `menu`, as
 * the web result's "See your progress in My Records" link. My Records is
 * the account modal's screen, presented over this session modal, so its ×
 * comes back to the result.
 */
export function ChallengeRecordStatus({
  attemptId,
  menu,
}: {
  attemptId: string | undefined;
  /** The challenge just played, which My Records opens on. */
  menu: ChallengeMenuType;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const auth = useAuthState();
  const [status, setStatus] = useState<Status>("saving");
  const [promoted, setPromoted] = useState<string[]>([]);

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
    if (!attemptId) return;
    let cancelled = false;
    void finishChallenge(attemptId).then((result) => {
      if (cancelled) return;
      setStatus(result.kind);
      if (result.kind === "recorded") {
        setPromoted(result.grantedRanks.map((rank) => rank.slug));
        // The EXP and any new rank show on the home tab's progress card.
        void refreshAccount();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (!attemptId) {
    if (auth.status !== "signedOut") return null;
    return (
      <View style={styles.signInRow}>
        <ChallengeSignInRow />
      </View>
    );
  }

  // challenge.record.{saving,recorded,notRecorded,failed}
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
        // The spinner sits beside its line; everything else stacks.
        status === "saving" && styles.row,
        { backgroundColor: colors.card },
      ]}
      accessibilityLiveRegion="polite"
    >
      {status === "saving" && <ActivityIndicator color={colors.primary} />}
      <Text style={[styles.text, { color }]}>
        {t(`challenge.record.${status}`)}
      </Text>
      {promoted.map((slug) => (
        <Text
          key={slug}
          style={[styles.promoted, { color: colors.foreground }]}
        >
          {t("challenge.promoted", { rank: rankLabel(slug, t) })}
        </Text>
      ))}
      {status === "recorded" ? (
        <Button
          title={t("challenge.viewMyRecords")}
          icon="trending-up"
          variant="outline"
          size="sm"
          onPress={() =>
            router.push({ pathname: "/records", params: { menu } })
          }
          testID="challenge-view-my-records"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.md,
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
