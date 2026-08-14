'use client';

import { AuthField } from '@/app/_components/AuthFormFields';
import { MIN_PASSWORD_LENGTH } from '@/config';

type Props = {
  password: string;
  onPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  labels: {
    password: string;
    passwordPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
  };
};

/**
 * The password + confirmation pair for setting a *new* password — sign-up and
 * password reset.
 *
 * `autoComplete="new-password"` on both is what stops a password manager
 * offering the existing credential and prompts it to generate one instead; the
 * sign-in form deliberately uses `current-password` and is not this component.
 * Keeping the pair together also keeps `minLength` on both fields, which is
 * the browser-side half of the strength rule the server re-checks.
 */
export function NewPasswordFields({
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  labels,
}: Props) {
  return (
    <>
      <AuthField
        id="password"
        type="password"
        label={labels.password}
        value={password}
        onChange={onPasswordChange}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        placeholder={labels.passwordPlaceholder}
      />

      <AuthField
        id="confirmPassword"
        type="password"
        label={labels.confirmPassword}
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        placeholder={labels.confirmPasswordPlaceholder}
      />
    </>
  );
}
