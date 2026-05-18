import { TextInput } from './TextInput';
import { AUTH_FORM_LABEL_CLASSES, AUTH_SUBMIT_BUTTON_CLASSES } from './authFormStyles';

type AuthFieldProps = {
  id: string;
  label: string;
  type: 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  /** Native `minLength` — set on new-password fields. */
  minLength?: number;
  placeholder?: string;
};

/**
 * A labelled compact text input for the authentication forms (sign-in,
 * sign-up, forgot/reset/change password). All auth fields are `required`.
 */
export function AuthField({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
}: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={AUTH_FORM_LABEL_CLASSES}>
        {label}
      </label>
      <TextInput
        id={id}
        type={type}
        inputSize="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  );
}

type AuthSubmitButtonProps = {
  isLoading: boolean;
  /** Label shown when idle. */
  idleLabel: string;
  /** Label shown while the request is in flight. */
  loadingLabel: string;
};

/** The pill-styled primary submit button shared by the auth forms. */
export function AuthSubmitButton({ isLoading, idleLabel, loadingLabel }: AuthSubmitButtonProps) {
  return (
    <button type="submit" disabled={isLoading} className={AUTH_SUBMIT_BUTTON_CLASSES}>
      {isLoading ? loadingLabel : idleLabel}
    </button>
  );
}
