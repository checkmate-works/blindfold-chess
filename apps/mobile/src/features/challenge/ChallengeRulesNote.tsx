import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import { ListIcon, ListRow, ListSection } from "../../components";
import { useTheme } from "../../theme";

/**
 * Whether a challenge on this setup screen will be recorded (part of the
 * web's `StandardChallengeRules`), as a grouped row. The rules themselves —
 * the time limit and mistake limit shared by every challenge — sit in the
 * setup footer's hint, right above the Challenge button, so they are not
 * repeated here.
 *
 * Signed out, the row is the way to sign in: "Sign in / Create account" with
 * what it gets you underneath and a chevron, the shape of iOS Settings'
 * "Sign in to your iPhone" row. The web says the same in a text link; an app
 * makes the whole row the target instead, so it is easy to hit and reads as
 * something to open rather than as a sentence. Signed in, it states that the
 * score will be recorded and does nothing on a tap. A build without accounts
 * (and the moment before the session is known) shows nothing: there is no
 * sign-in to offer.
 */
export function ChallengeRulesNote() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const auth = useAuth();
  const router = useRouter();

  if (auth.status === "unavailable" || auth.status === "loading") return null;

  return (
    <ListSection>
      {auth.status === "signedIn" ? (
        <ListRow
          leading={<ListIcon ionicon="trophy" tint={colors.success} />}
          title={t("challenge.willRecord")}
        />
      ) : (
        <ListRow
          leading={<ListIcon ionicon="trophy" tint={colors.primary} />}
          title={t("settings.account.signIn")}
          subtitle={t("challenge.signInBenefit")}
          onPress={() => router.push("/sign-in")}
          testID="challenge-sign-in"
        />
      )}
    </ListSection>
  );
}
