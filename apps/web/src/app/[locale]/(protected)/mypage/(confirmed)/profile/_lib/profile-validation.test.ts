import { describe, expect, it } from 'vitest';

import type { ProfileFields } from './profile-validation';
import { describeProfileError, validateProfileFields } from './profile-validation';

const EMPTY_FIELDS: ProfileFields = {
  displayName: 'Valid Name',
  bio: '',
  country: '',
  flair: '',
  fideId: '',
  chesscomUsername: '',
  lichessUsername: '',
  xUsername: '',
  instagramUsername: '',
  youtubeHandle: '',
};

const validate = (fields: Partial<ProfileFields>) =>
  validateProfileFields({ ...EMPTY_FIELDS, ...fields });

describe('validateProfileFields', () => {
  it('accepts a display name alone', () => {
    expect(validate({})).toBeNull();
  });

  it('reports the field and i18n key for a server rule', () => {
    expect(validate({ displayName: '   ' })).toEqual({
      messageKey: 'displayNameRequired',
      field: 'displayName',
    });
    expect(validate({ fideId: '12a' })).toEqual({
      messageKey: 'fideIdInvalidFormat',
      field: 'fideId',
    });
    expect(validate({ country: 'ZZ' })).toEqual({
      messageKey: 'countryInvalid',
      field: 'country',
    });
  });

  it('normalizes the way the server does before judging', () => {
    // The bio is trimmed before its length is checked, and the country is
    // uppercased, so a value the server would accept is not refused here.
    expect(validate({ bio: `${'a'.repeat(500)}   ` })).toBeNull();
    expect(validate({ country: 'jp' })).toBeNull();
  });

  it('does not run the profanity check, leaving it to the server', () => {
    expect(validate({ displayName: 'badname' })).toBeNull();
  });
});

describe('describeProfileError', () => {
  it('maps a known code to its form rendering', () => {
    expect(describeProfileError('display_name_too_long')).toEqual({
      messageKey: 'displayNameMaxLength',
      field: 'displayName',
    });
  });

  it('returns null for a code the form does not render', () => {
    expect(describeProfileError('signInRequired')).toBeNull();
  });
});
