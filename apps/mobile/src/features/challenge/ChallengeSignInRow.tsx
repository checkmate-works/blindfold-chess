import { useTranslation } from "react-i18next";

import { SignInRow } from "../account/SignInRow";

/**
 * The sign-in row around a challenge: the setup screen shows it before a
 * run and the result screen after an unrecorded one. It renders
 * unconditionally: the caller decides that the player is signed out.
 */
export function ChallengeSignInRow() {
  const { t } = useTranslation();
  return (
    <SignInRow
      ionicon="trophy"
      benefit={t("challenge.signInBenefit")}
      testID="challenge-sign-in"
    />
  );
}
