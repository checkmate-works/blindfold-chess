import { useState } from 'react';

type UseRecallSettingsOptions = {
  initialAutoOpponent: boolean;
};

/**
 * Owns all "tweakable" recall settings (currently just `autoOpponent`).
 * Extracted so the top-level hook is an orchestrator, not a settings bag.
 *
 * Note: nothing is persisted to localStorage today — the caller passes the
 * initial value in from URL params / props. This hook is the designated
 * integration point if/when persistence is added.
 */
export function useRecallSettings({ initialAutoOpponent }: UseRecallSettingsOptions) {
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);

  return {
    autoOpponent,
    setAutoOpponent,
  };
}
