/**
 * Shared class constants for authentication-related forms
 * (sign-in, sign-up, forgot-password, reset-password, change-password).
 *
 * These forms use a distinct visual style (compact inputs, pill-rounded
 * primary submit button) that differs from the app's general Button/TextInput
 * variants. Kept as simple constants to avoid fragmenting component props
 * for a small set of shared pages.
 */

export const AUTH_SUBMIT_BUTTON_CLASSES =
  'w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';

export const AUTH_FORM_LABEL_CLASSES = 'block text-sm font-medium text-foreground mb-1';
