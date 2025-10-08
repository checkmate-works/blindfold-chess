import type { ChessTerm } from '@/app/[locale]/_lib/types';

import { chessTerms } from '../_data/chess-terms';

/**
 * Get all unique first letters from chess terms
 */
export function getUniqueLetters(): string[] {
  return [...new Set(chessTerms.map((term) => term.term.charAt(0).toUpperCase()))].sort();
}

/**
 * Filter terms by first letter
 */
export function getTermsByLetter(letter: string): ChessTerm[] {
  const upperLetter = letter.toUpperCase();
  return chessTerms.filter((term) => term.term.charAt(0).toUpperCase() === upperLetter);
}

/**
 * Filter terms by category
 */
export function getTermsByCategory(category: string): ChessTerm[] {
  return chessTerms.filter((term) => term.category === category);
}

/**
 * Get count of terms for each letter
 */
export function getLetterCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  chessTerms.forEach((term) => {
    const letter = term.term.charAt(0).toUpperCase();
    counts[letter] = (counts[letter] || 0) + 1;
  });
  return counts;
}

/**
 * Get count of terms for each category
 */
export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  chessTerms.forEach((term) => {
    if (term.category) {
      counts[term.category] = (counts[term.category] || 0) + 1;
    }
  });
  return counts;
}
