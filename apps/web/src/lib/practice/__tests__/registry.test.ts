import { describe, expect, it } from 'vitest';

import {
  CHALLENGE_MENU_TYPES,
  MODULE_TO_SLUG,
  PRACTICE_MENU_TYPES,
  PRACTICE_MODULE_REGISTRY,
  SLUG_TO_MODULE,
} from '../registry';

describe('PRACTICE_MODULE_REGISTRY', () => {
  it('contains exactly thirteen entries', () => {
    expect(PRACTICE_MODULE_REGISTRY).toHaveLength(13);
  });

  it('has unique snake_case slugs', () => {
    const snakeSlugs = PRACTICE_MODULE_REGISTRY.map((m) => m.slugSnake);
    expect(new Set(snakeSlugs).size).toBe(snakeSlugs.length);
  });

  it('has unique kebab-case slugs', () => {
    const kebabSlugs = PRACTICE_MODULE_REGISTRY.map((m) => m.slugKebab);
    expect(new Set(kebabSlugs).size).toBe(kebabSlugs.length);
  });

  it('every snake_case slug is the underscore form of its kebab slug', () => {
    for (const m of PRACTICE_MODULE_REGISTRY) {
      expect(m.slugSnake.replace(/_/g, '-')).toBe(m.slugKebab);
    }
  });
});

describe('PRACTICE_MENU_TYPES', () => {
  it('contains all thirteen menu types', () => {
    expect(PRACTICE_MENU_TYPES).toHaveLength(13);
  });

  it('includes coordinate_quiz, legal_moves, position_memory, puzzle, etc.', () => {
    expect(PRACTICE_MENU_TYPES).toContain('coordinate_quiz');
    expect(PRACTICE_MENU_TYPES).toContain('legal_moves');
    expect(PRACTICE_MENU_TYPES).toContain('position_memory');
    expect(PRACTICE_MENU_TYPES).toContain('puzzle');
    expect(PRACTICE_MENU_TYPES).toContain('quadrant_anchors');
    expect(PRACTICE_MENU_TYPES).toContain('fen');
  });
});

describe('CHALLENGE_MENU_TYPES', () => {
  it('contains exactly six modules', () => {
    expect(CHALLENGE_MENU_TYPES).toHaveLength(6);
  });

  it('is a subset of PRACTICE_MENU_TYPES', () => {
    for (const m of CHALLENGE_MENU_TYPES) {
      expect(PRACTICE_MENU_TYPES).toContain(m);
    }
  });

  it('contains the canonical six challenge modules', () => {
    expect(CHALLENGE_MENU_TYPES).toEqual(
      expect.arrayContaining([
        'coordinate_quiz',
        'legal_moves',
        'square_colors',
        'diagonal_quiz',
        'board_symmetry',
        'route_planner',
      ])
    );
  });
});

describe('MODULE_TO_SLUG / SLUG_TO_MODULE', () => {
  it('MODULE_TO_SLUG covers every challenge menu type exactly once', () => {
    expect(Object.keys(MODULE_TO_SLUG).sort()).toEqual([...CHALLENGE_MENU_TYPES].sort());
  });

  it('SLUG_TO_MODULE is the inverse of MODULE_TO_SLUG', () => {
    for (const [snake, kebab] of Object.entries(MODULE_TO_SLUG)) {
      expect(SLUG_TO_MODULE[kebab]).toBe(snake);
    }
  });
});
