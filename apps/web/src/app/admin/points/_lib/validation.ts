const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Upper bound on a single admin grant. 100,000 pt = ~274 years of ad_free
 * at the 1 pt/day rate, which is far beyond any conceivable legitimate
 * use. The cap is here to prevent a fat-finger from generating a row that
 * would warp the user_point_balances cache permanently.
 */
const MAX_AMOUNT = 100_000;

export function validateUuid(id: string): string | null {
  return UUID_REGEX.test(id) ? null : `Invalid User ID format: ${id}`;
}

export function validateAmount(amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return 'Amount must be a positive integer';
  }
  if (amount > MAX_AMOUNT) {
    return `Amount must not exceed ${MAX_AMOUNT}`;
  }
  return null;
}
