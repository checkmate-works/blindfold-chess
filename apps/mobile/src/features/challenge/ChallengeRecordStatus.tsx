import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "../../components";
import { useTheme, borderRadius, fontSize, spacing } from "../../theme";
import { refreshAccount, useAuth as useAuthState } from "../../auth/use-auth";
import { rankLabel } from "../records/rank-label";
import { finishChallenge } from "./challenge-api";
import { ChallengeSignInRow } from "./ChallengeSignInRow";

type Status = "saving" | "recorded" | "notRecorded" | "failed";

/**
 * The result screen's line about the leaderboard: for a recorded run it
 * finishes the attempt on the server (once) and says whether the score was
 * recorded; for an unrecorded run by a signed-out player it invites them to
 * sign in, as the web's result page does.
 *
 * `signInPrompt="row"` makes that invitation the setup screen's sign-in row
 * (`ChallengeSignInRow`) instead of the inline sentence and button. Square
 * colors uses it; the other modules move to it once its look is settled,
 * and the inline form goes then.
 */
export function ChallengeRecordStatus({
  attemptId,
  signInPrompt = "inline",
}: {
  attemptId: string | undefined;
  signInPrompt?: "inline" | "row";
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const auth = useAuthState();
  const [status, setStatus] = useState<Status>("saving");
  const [promoted, setPromoted] = useState<string[]>([]);

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
    if (signInPrompt === "row") {
      return (
        <View style={styles.signInRow}>
          <ChallengeSignInRow />
        </View>
      );
    }
    return (
      <View style={[styles.box, { backgroundColor: colors.card }]}>
        <Text style={[styles.text, { color: colors.foreground }]}>
          {t("challenge.signInToRecord")}
        </Text>
        <Button
          title={t("settings.account.signIn")}
          variant="outline"
          size="sm"
          onPress={() => router.push("/sign-in")}
        />
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
        promoted.length === 0 && styles.row,
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
