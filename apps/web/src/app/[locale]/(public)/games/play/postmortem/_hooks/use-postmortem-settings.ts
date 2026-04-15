import { useState } from 'react';

type UsePostmortemSettingsOptions = {
  initialAutoOpponent: boolean;
};

/**
 * Owns all "tweakable" postmortem settings (currently just `autoOpponent`).
 * Extracted so the top-level hook is an orchestrator, not a settings bag.
 *
 * Note: nothing is persisted to localStorage today — the caller passes the
 * initial value in from URL params / props. This hook is the designated
 * integration point if/when persistence is added.
 */
export function usePostmortemSettings({ initialAutoOpponent }: UsePostmortemSettingsOptions) {
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);

  return {
    autoOpponent,
    setAutoOpponent,
  };
}
