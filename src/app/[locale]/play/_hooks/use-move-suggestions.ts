import { useState, useCallback, useEffect } from 'react';
import { generateMoveSuggestions } from '../_lib/move-suggestions';
import type { AlgebraicNotation } from '../_lib/types';

interface UseMoveSuggestionsOptions {
  /**
   * Whether suggestions should be enabled
   */
  enabled?: boolean;
  /**
   * Callback when a suggestion is selected
   */
  onSelect?: (move: AlgebraicNotation) => void;
}

export function useMoveSuggestions({ enabled = true, onSelect }: UseMoveSuggestionsOptions = {}) {
  const [suggestions, setSuggestions] = useState<AlgebraicNotation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  /**
   * Update suggestions based on input value
   */
  const updateSuggestions = useCallback(
    (input: string) => {
      if (!enabled) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const newSuggestions = generateMoveSuggestions(input);
      // Limit to 20 suggestions for better UX
      const limitedSuggestions = newSuggestions.slice(0, 20);
      setSuggestions(limitedSuggestions);
      setShowSuggestions(limitedSuggestions.length > 0);
    },
    [enabled]
  );

  /**
   * Hide suggestions
   */
  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  /**
   * Show suggestions if they exist
   */
  const showSuggestionsIfAvailable = useCallback(() => {
    setShowSuggestions(suggestions.length > 0);
  }, [suggestions.length]);

  /**
   * Select a suggestion
   */
  const selectSuggestion = useCallback(
    (suggestion: AlgebraicNotation) => {
      hideSuggestions();
      onSelect?.(suggestion);
    },
    [hideSuggestions, onSelect]
  );

  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Clear suggestions when disabled
  useEffect(() => {
    if (!enabled) {
      clearSuggestions();
    }
  }, [enabled, clearSuggestions]);

  return {
    suggestions,
    showSuggestions,
    updateSuggestions,
    hideSuggestions,
    showSuggestionsIfAvailable,
    selectSuggestion,
    clearSuggestions,
  };
}
