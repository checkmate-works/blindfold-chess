/** Statuses that grant active subscriber benefits (e.g., ad-free). */
export const BENEFIT_ACTIVE_STATUSES = ['active', 'trialing'] as const;

/** Statuses that indicate a displayable (non-terminal) subscription. */
export const DISPLAYABLE_STATUSES = ['active', 'trialing', 'past_due'] as const;
