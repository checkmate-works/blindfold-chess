import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import { ListIcon, ListRow, ListSection } from "../../components";
import { useTheme } from "../../theme";
import { ChallengeSignInRow } from "./ChallengeSignInRow";

/**
 * Whether a challenge on this setup screen will be recorded (part of the
 * web's `StandardChallengeRules`), as a grouped row. The rules themselves —
 * the time limit and mistake limit shared by every challenge — sit in the
 * setup footer's hint, right above the Challenge button, so they are not
 * repeated here.
 *
 * Signed out, the row is the way to sign in (`ChallengeSignInRow`). Signed
 * in, it states that the score will be recorded and does nothing on a tap.
 * A build without accounts (and the moment before the session is known)
 * shows nothing: there is no sign-in to offer.
 */
export function ChallengeRulesNote() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const auth = useAuth();

  if (auth.status === "unavailable" || auth.status === "loading") return null;
  if (auth.status !== "signedIn") return <ChallengeSignInRow />;

  return (
    <ListSection>
      <ListRow
        leading={<ListIcon ionicon="trophy" tint={colors.success} />}
        title={t("challenge.willRecord")}
      />
    </ListSection>
  );
}
