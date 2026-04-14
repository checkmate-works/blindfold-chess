import enMessages from '@/messages/en.json';
import { describe, expect, it } from 'vitest';

/**
 * Guards the i18n keys consumed by the admin achievements pages and the
 * refactored admin grants page.
 *
 * The admin surface only renders against the English locale (see
 * `apps/web/src/app/admin/layout.tsx`, which hard-codes `locale: 'en'`),
 * so we only need to assert en.json has the expected keys — missing keys
 * would crash the page at render time with a next-intl
 * `IntlError: MISSING_MESSAGE` exception.
 */

function getAt(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      obj
    );
}

const en = enMessages as unknown as Record<string, unknown>;

// Keys referenced by apps/web/src/app/admin/achievements/page.tsx,
// apps/web/src/app/admin/achievements/[id]/page.tsx, and the grants link
// in apps/web/src/app/admin/layout.tsx.
const REQUIRED_ACHIEVEMENT_KEYS = [
  'Admin.achievements.navLabel',
  'Admin.achievements.title',
  'Admin.achievements.description',
  'Admin.achievements.noAchievementsFound',
  'Admin.achievements.showing',
  'Admin.achievements.viewHolders',
  'Admin.achievements.yes',
  'Admin.achievements.no',
  'Admin.achievements.columns.displayName',
  'Admin.achievements.columns.slug',
  'Admin.achievements.columns.category',
  'Admin.achievements.columns.iconKey',
  'Admin.achievements.columns.repeatable',
  'Admin.achievements.columns.displayOrder',
  'Admin.achievements.columns.holderCount',
  'Admin.achievements.columns.actions',
  'Admin.achievements.detail.backToList',
  'Admin.achievements.detail.headerTitle',
  'Admin.achievements.detail.slug',
  'Admin.achievements.detail.category',
  'Admin.achievements.detail.iconKey',
  'Admin.achievements.detail.repeatable',
  'Admin.achievements.detail.displayOrder',
  'Admin.achievements.detail.holderCount',
  'Admin.achievements.detail.createdAt',
  'Admin.achievements.detail.holdersTitle',
  'Admin.achievements.detail.showingHolders',
  'Admin.achievements.detail.noHoldersFound',
  'Admin.achievements.detail.anonymous',
  'Admin.achievements.detail.columns.username',
  'Admin.achievements.detail.columns.userId',
  'Admin.achievements.detail.columns.achievedAt',
  'Admin.achievements.detail.columns.metadata',
];

// Keys referenced by apps/web/src/app/admin/grants/page.tsx after the
// hardcoded-English → t(...) migration, plus the sidebar link.
const REQUIRED_GRANTS_KEYS = [
  'Admin.grants.navLabel',
  'Admin.grants.title',
  'Admin.grants.noGrantsFound',
  'Admin.grants.showing',
  'Admin.grants.columns.user',
  'Admin.grants.columns.benefit',
  'Admin.grants.columns.grantType',
  'Admin.grants.columns.reason',
  'Admin.grants.columns.period',
  'Admin.grants.columns.status',
  'Admin.grants.columns.actions',
  'Admin.grants.status.revoked',
  'Admin.grants.status.expired',
  'Admin.grants.status.active',
];

describe('Admin.achievements i18n keys', () => {
  it.each(REQUIRED_ACHIEVEMENT_KEYS)('en.json defines %s', (path) => {
    const value = getAt(en, path);
    expect(value, `${path} must be a non-empty string in en.json`).toBeTypeOf('string');
    expect((value as string).length).toBeGreaterThan(0);
  });
});

describe('Admin.grants i18n keys (after migration to t(...))', () => {
  it.each(REQUIRED_GRANTS_KEYS)('en.json defines %s', (path) => {
    const value = getAt(en, path);
    expect(value, `${path} must be a non-empty string in en.json`).toBeTypeOf('string');
    expect((value as string).length).toBeGreaterThan(0);
  });
});
