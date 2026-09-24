import { isLameName } from '@blindfold-chess/features/lame-name';
import { describe, expect, it } from 'vitest';

import {
  checkDisplayNameHomoglyphs,
  confusableSkeleton,
  hidesLameName,
  imitatesReservedName,
} from './display-name-homoglyph';

// Look-alike and invisible characters are built from code points so the
// fixtures stay legible in review: a literal Cyrillic "а" is indistinguishable
// from the Latin one it is meant to be mistaken for.
const cp = (...codePoints: number[]) => String.fromCodePoint(...codePoints);
const CYR_A = cp(0x0430); // а
const CYR_O = cp(0x043e); // о
const CYR_ES = cp(0x0441); // с
const CYR_DZE = cp(0x0455); // ѕ
const CYR_I = cp(0x0456); // і
const GREEK_OMICRON = cp(0x03bf); // ο
const CYR_CAPITAL_O = cp(0x041e); // О
const ZWSP = cp(0x200b);
const ZWJ = cp(0x200d);
const WORD_JOINER = cp(0x2060);
const BOM = cp(0xfeff);
const COMBINING_ACUTE = cp(0x0301);
const toFullWidth = (ascii: string) =>
  Array.from(ascii, (ch) => cp(ch.codePointAt(0)! - 0x21 + 0xff01)).join('');

const check = (name: string) => checkDisplayNameHomoglyphs(name, { isLameName });

describe('confusableSkeleton', () => {
  it('maps Cyrillic look-alikes to the Latin letters they imitate', () => {
    expect(confusableSkeleton(`${CYR_A}dmin`)).toBe(confusableSkeleton('admin'));
    expect(confusableSkeleton(`${CYR_DZE}upp${CYR_O}rt`)).toBe(confusableSkeleton('support'));
  });

  it('folds full-width letters through NFKC', () => {
    expect(confusableSkeleton(toFullWidth('ADMIN'))).toBe(confusableSkeleton('admin'));
  });

  it('drops zero-width and other format characters', () => {
    expect(confusableSkeleton(`ad${ZWSP}m${ZWJ}i${WORD_JOINER}n${BOM}`)).toBe(
      confusableSkeleton('admin')
    );
  });

  it('strips combining marks', () => {
    expect(confusableSkeleton(`a${COMBINING_ACUTE}dmin`)).toBe(confusableSkeleton('admin'));
    expect(confusableSkeleton('ádmin')).toBe(confusableSkeleton('admin'));
  });

  it('merges ASCII look-alikes the same way on both sides of a comparison', () => {
    expect(confusableSkeleton('adm1n')).toBe(confusableSkeleton('admin'));
    expect(confusableSkeleton('m0d')).toBe(confusableSkeleton('mod'));
    expect(confusableSkeleton('rnod')).toBe(confusableSkeleton('mod'));
  });

  it('maps uppercase Cyrillic before lowercasing', () => {
    expect(confusableSkeleton(`${CYR_CAPITAL_O}FFICIAL`)).toBe(confusableSkeleton('official'));
  });
});

describe('imitatesReservedName', () => {
  it.each([
    ['Cyrillic а in admin', `${CYR_A}dmin`],
    ['Cyrillic ѕ and о in support', `${CYR_DZE}upp${CYR_O}rt`],
    ['Cyrillic о and а in official', `${CYR_O}ffici${CYR_A}l`],
    ['Cyrillic о in moderator', `moderat${CYR_O}r`],
    ['Greek omicron in bot', `b${GREEK_OMICRON}t`],
    ['full-width admin', toFullWidth('admin')],
    ['full-width Support', toFullWidth('Support')],
    ['zero-width space inside admin', `ad${ZWSP}min`],
    ['accented admin', 'ádmin'],
    ['disguised word next to a plain one', `Official ${CYR_DZE}upport`],
    ['disguised word next to Japanese', `運営 ${CYR_A}dmin`],
    ['disguised name split by punctuation', `${CYR_DZE}up.port`],
    ['disguised platform name', `g${CYR_O}${CYR_O}gle`],
    ['disguised multi-word reserved name', `n${CYR_O}_reply`],
    ['Cyrillic і in admin', `adm${CYR_I}n`],
  ])('rejects %s', (_label, name) => {
    expect(imitatesReservedName(name)).toBe(true);
  });

  it.each([
    // Plain ASCII is not a disguise; whether "admin" itself is an acceptable
    // display name is a separate policy this module does not decide.
    ['plain ASCII admin', 'admin'],
    ['plain ASCII Support Team', 'Support Team'],
    ['Russian name', 'Алексей'],
    ['Russian name with patronymic', 'Алексей Иванович'],
    ['Greek name', 'Νίκος'],
    ['Japanese name', '山田太郎'],
    ['katakana name', 'ヤマダ'],
    ['Japanese mixed with a plain ASCII reserved word', '山田 support'],
    ['Japanese mixed with Latin', 'チェス好きのKenta'],
    ['accented Latin name', 'José Pérez'],
    ['accented Portuguese word that is reserved only as a username', 'Pró'],
    ['full-width word that is reserved only as a username', toFullWidth('King')],
    ['emoji and a plain word', '♟ admin'],
    ['non-reserved Cyrillic-disguised word', `${CYR_A}lice`],
  ])('accepts %s', (_label, name) => {
    expect(imitatesReservedName(name)).toBe(false);
  });
});

describe('hidesLameName', () => {
  it.each([
    ['a Cyrillic letter', `idi${CYR_O}t`],
    ['full-width letters', toFullWidth('idiot')],
    ['a zero-width space', `idi${ZWSP}ot`],
    ['a Cyrillic с', `${CYR_ES}oon`],
  ])('catches a lame word disguised with %s', (_label, name) => {
    expect(hidesLameName(name, isLameName)).toBe(true);
  });

  it('leaves plain ASCII names to the plain isLameName check', () => {
    expect(hidesLameName('idiot', isLameName)).toBe(false);
  });

  it.each(['Алексей', 'Алексей Иванович', 'Νίκος', '山田太郎', 'José Pérez', 'Ольга Сергеевна'])(
    'does not flag %s',
    (name) => {
      expect(hidesLameName(name, isLameName)).toBe(false);
    }
  );
});

describe('checkDisplayNameHomoglyphs', () => {
  it('reports a disguised reserved name as impersonation', () => {
    expect(check(`${CYR_A}dmin`)).toBe('display_name_impersonation');
  });

  it('reports a disguised lame word as inappropriate', () => {
    expect(check(`idi${CYR_O}t`)).toBe('display_name_inappropriate');
  });

  it('prefers the inappropriate verdict when both apply', () => {
    // "administrator" is a lame word as well as an impersonation target.
    expect(check(`${CYR_A}dministrator`)).toBe('display_name_inappropriate');
  });

  it.each(['Алексей', '山田太郎', 'Kenta', 'José', '山田 support'])('accepts %s', (name) => {
    expect(check(name)).toBeNull();
  });
});
