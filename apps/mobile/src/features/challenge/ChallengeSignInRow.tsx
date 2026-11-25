import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListIcon, ListRow, ListSection } from "../../components";
import { useTheme } from "../../theme";

/**
 * The one way a signed-out player is invited to sign in around a challenge:
 * a grouped row reading "Sign in / Create account", what it gets you
 * underneath, and a chevron — the shape of iOS Settings' "Sign in to your
 * iPhone" row. The whole row is the target, so it is easy to hit and reads
 * as something to open rather than as a sentence.
 *
 * The setup screen shows it before a run and the result screen after an
 * unrecorded one; both use this component so the invitation looks the same
 * wherever it appears. It renders unconditionally: the caller decides that
 * the player is signed out.
 */
export function ChallengeSignInRow() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ListSection>
      <ListRow
        leading={<ListIcon ionicon="trophy" tint={colors.primary} />}
        title={t("settings.account.signIn")}
        subtitle={t("challenge.signInBenefit")}
        onPress={() => router.push("/sign-in")}
        testID="challenge-sign-in"
      />
    </ListSection>
  );
}
