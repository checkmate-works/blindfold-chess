import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ChallengeMenuType } from "@blindfold-chess/features/practice-registry";

import { Button, Screen } from "../../components";
import { SessionTopBar } from "../../navigation/SessionTopBar";
import { useTheme, fontSize, spacing } from "../../theme";
import {
  useChallengeAttempt,
  type ChallengeAttempt,
} from "./useChallengeAttempt";

type Props<Q> = {
  menuType: ChallengeMenuType;
  settings: unknown;
  /** Rendered once the attempt is decided; the session mounts here. */
  children: (attempt: ChallengeAttempt<Q>) => ReactNode;
};

/**
 * Holds a challenge session back until it is known whether the run is
 * recorded (the web's `ChallengeAttemptGate`): the shared session hooks read
 * `remote` on mount only, so the session must not mount before it.
 */
export function ChallengeAttemptGate<Q>({
  menuType,
  settings,
  children,
}: Props<Q>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = useChallengeAttempt<Q>(menuType, settings);

  if (state.status === "ready") return <>{children(state)}</>;

  return (
    <Screen>
      <SessionTopBar confirm={false} />
      <View style={styles.center}>
        {state.status === "loading" ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <Text style={[styles.message, { color: colors.foreground }]}>
              {state.reason === "rateLimited"
                ? t("challenge.startRateLimited")
                : t("challenge.startFailed")}
            </Text>
            <Button title={t("challenge.retry")} onPress={state.retry} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    textAlign: "center",
  },
});
