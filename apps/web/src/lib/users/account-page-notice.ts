/**
 * The query contract that carries a result back to the account page
 * (`/mypage/account`) from a flow that completes in another request.
 *
 * Adding a Google account (auth server → Google → `/auth/callback`) and
 * confirming an email change (link in the email → `/auth/callback`) both
 * finish in a request the page never started, so the in-page toast cannot
 * report them — the page does not even learn that they failed. Instead
 * `/auth/callback` appends one of the keys below and the page renders the
 * matching sentence from `MypageAccount.notices.<key>`.
 *
 * These are rendered inline rather than through the `?toast=` mechanism
 * because that toast disappears after three seconds, and "open the link in
 * the other email too" or "this Google account is already linked elsewhere"
 * must stay on screen until read.
 *
 * Operations that complete inside the page (unlink, sending an email) use
 * `showToast` and never go through here.
 */

export const ACCOUNT_PAGE_PATH = '/mypage/account';

const NOTICE_PARAM = 'notice';

export const ACCOUNT_PAGE_NOTICES = [
  /** A Google account was linked */
  'linkedGoogle',
  /** The chosen Google account is already linked to this or another account */
  'linkDuplicate',
  /** The round-trip to Google failed somewhere */
  'linkFailed',
  /** The first of the two email-change confirmation links was opened */
  'emailChangePending',
  /** The email change is complete */
  'emailChangeDone',
  /** The email-change link is invalid or expired */
  'emailChangeLinkInvalid',
] as const;

export type AccountPageNotice = (typeof ACCOUNT_PAGE_NOTICES)[number];

const noticeSet: ReadonlySet<string> = new Set(ACCOUNT_PAGE_NOTICES);

/** The locale-prefixed account page URL, with an optional notice. */
export function accountPageHref(locale: string, notice?: AccountPageNotice): string {
  const path = `/${locale}${ACCOUNT_PAGE_PATH}`;
  return notice === undefined ? path : `${path}?${NOTICE_PARAM}=${notice}`;
}

/**
 * Read the notice from `searchParams`. Unknown values and arrays are
 * ignored, so an arbitrary string in the URL never reaches the dictionary.
 */
export function readAccountPageNotice(
  searchParams: Readonly<Record<string, string | readonly string[] | undefined>>
): AccountPageNotice | undefined {
  const value = searchParams[NOTICE_PARAM];
  return typeof value === 'string' && isAccountPageNotice(value) ? value : undefined;
}

function isAccountPageNotice(value: string): value is AccountPageNotice {
  return noticeSet.has(value);
}

/**
 * Query that tells `/auth/callback` it is the return leg of "Add a Google
 * account" (`linkIdentity`), not a sign-in.
 *
 * Attached to the `redirectTo` of `linkIdentity`; the auth server echoes it
 * back on success (`code`) and on failure (`error_code`) alike, so the
 * callback can send both outcomes to the account page instead of the
 * sign-in landing.
 */
export const LINK_RETURN_PARAM = 'link';
export const LINK_RETURN_GOOGLE = 'google';
