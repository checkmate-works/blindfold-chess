import { describe, expect, it } from 'vitest';

import {
  CONSENT_COOKIE_MAX_AGE_SEC,
  CONSENT_COOKIE_NAME,
  CONSENT_SCHEMA_VERSION,
  consentCookieAssignment,
  consentCookieErasure,
  consentCookieValue,
  parseConsentCookieValue,
  readConsentDecision,
} from './consent-cookie';

describe('consentCookieValue', () => {
  it('prefixes the decision with the schema version', () => {
    expect(consentCookieValue('granted')).toBe(`${CONSENT_SCHEMA_VERSION}:granted`);
    expect(consentCookieValue('denied')).toBe(`${CONSENT_SCHEMA_VERSION}:denied`);
  });
});

describe('parseConsentCookieValue', () => {
  it('reads back both decisions written under the current version', () => {
    expect(parseConsentCookieValue(consentCookieValue('granted'))).toBe('granted');
    expect(parseConsentCookieValue(consentCookieValue('denied'))).toBe('denied');
  });

  it.each([undefined, null, '', 'granted', '1:', '1:maybe', 'x:granted'])(
    'treats %o as no answer yet',
    (raw) => {
      expect(parseConsentCookieValue(raw)).toBeNull();
    }
  );

  it('rejects a decision recorded under a different schema version', () => {
    // Bumping the version is how the banner is re-shown to everyone after the
    // wording or the scope of consent changes; a stale value must not count as
    // an answer to the new question.
    expect(parseConsentCookieValue('0:granted')).toBeNull();
    expect(parseConsentCookieValue('2:granted')).toBeNull();
  });
});

describe('readConsentDecision', () => {
  it('finds the cookie at the start of the string and after a separator', () => {
    expect(readConsentDecision(`${CONSENT_COOKIE_NAME}=1:granted`)).toBe('granted');
    expect(readConsentDecision(`theme=dark; ${CONSENT_COOKIE_NAME}=1:denied; x=y`)).toBe('denied');
  });

  it('returns null when the cookie is absent', () => {
    expect(readConsentDecision('')).toBeNull();
    expect(readConsentDecision('theme=dark; bfc_ads_hidden=1')).toBeNull();
  });

  it('does not match a cookie whose name merely ends with ours', () => {
    expect(readConsentDecision(`not_${CONSENT_COOKIE_NAME}=1:granted`)).toBeNull();
  });

  it('survives a malformed percent-escape instead of throwing', () => {
    // decodeURIComponent throws on a lone `%`. An unreadable cookie is treated
    // as an absent one, which shows the banner again rather than crashing the
    // bootstrap of every page.
    expect(readConsentDecision(`${CONSENT_COOKIE_NAME}=%`)).toBeNull();
  });
});

describe('consentCookieAssignment', () => {
  it('writes the versioned value with a six-month lifetime scoped to the whole site', () => {
    const assignment = consentCookieAssignment('granted');
    expect(assignment.startsWith(`${CONSENT_COOKIE_NAME}=1:granted;`)).toBe(true);
    expect(assignment).toContain('path=/');
    expect(assignment).toContain(`max-age=${CONSENT_COOKIE_MAX_AGE_SEC}`);
    expect(assignment).toContain('SameSite=Lax');
  });

  it('round-trips through the reader', () => {
    const [pair] = consentCookieAssignment('denied').split('; ');
    expect(readConsentDecision(pair)).toBe('denied');
  });
});

describe('consentCookieErasure', () => {
  it('expires the cookie on the same path it was written with', () => {
    const erasure = consentCookieErasure();
    expect(erasure).toContain(`${CONSENT_COOKIE_NAME}=;`);
    expect(erasure).toContain('path=/');
    expect(erasure).toContain('max-age=0');
  });
});
