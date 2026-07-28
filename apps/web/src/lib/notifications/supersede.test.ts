import { describe, expect, it } from 'vitest';

import { resolveSupersedeRule } from './supersede';

describe('resolveSupersedeRule', () => {
  it('returns null for a type that belongs to no collision class', () => {
    // These keep the plain exact-type dedup — a like and a reply from the same
    // actor on the same post are two things worth telling the recipient about.
    for (const type of ['follow', 'like', 'reply', 'announcement', 'benefit_grant']) {
      expect(resolveSupersedeRule(type)).toBeNull();
    }
  });

  describe('comment class', () => {
    it('lets new_comment_on_topic supersede the new_post fan-out', () => {
      const rule = resolveSupersedeRule('new_comment_on_topic');

      expect(rule).not.toBeNull();
      expect(rule?.dominatedTypes).toEqual(['new_post']);
      // Only itself: nothing outranks it in this class.
      expect(rule?.dominatingTypes).toEqual(['new_comment_on_topic']);
    });

    it('makes new_post yield to an existing new_comment_on_topic', () => {
      const rule = resolveSupersedeRule('new_post');

      expect(rule?.dominatingTypes).toEqual(['new_comment_on_topic', 'new_post']);
      expect(rule?.dominatedTypes).toEqual([]);
    });
  });

  describe('position fork class', () => {
    it.each(['puzzle_forked', 'memory_forked'])('lets %s supersede new_position', (type) => {
      const rule = resolveSupersedeRule(type);

      expect(rule?.dominatedTypes).toEqual(['new_position']);
    });

    it('does not let the two fork types supersede each other (same tier)', () => {
      // One position creation emits exactly one of them, so neither outranks
      // the other; they only collapse against a same-type duplicate.
      const rule = resolveSupersedeRule('puzzle_forked');

      expect(rule?.dominatingTypes).toEqual(['puzzle_forked', 'memory_forked']);
      expect(rule?.dominatedTypes).not.toContain('memory_forked');
    });

    it('makes new_position yield to either fork type', () => {
      const rule = resolveSupersedeRule('new_position');

      expect(rule?.dominatingTypes).toEqual(['puzzle_forked', 'memory_forked', 'new_position']);
      expect(rule?.dominatedTypes).toEqual([]);
    });
  });

  it('always includes the type itself among its dominating types', () => {
    // The supersede query replaces the exact-type dedup for these types, so
    // omitting self would let identical rows through.
    for (const type of [
      'new_comment_on_topic',
      'new_post',
      'puzzle_forked',
      'memory_forked',
      'new_position',
    ]) {
      expect(resolveSupersedeRule(type)?.dominatingTypes).toContain(type);
    }
  });
});
