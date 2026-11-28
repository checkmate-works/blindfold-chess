/**
 * The search params that open a practice setup screen with its help sheet
 * up: `/practice/<route>?help=1`. A link that means a module's tutorial (a
 * guide's link card) uses it, since the sheet holds the web tutorial's
 * explanation steps.
 */
export const SETUP_HELP_PARAM = { help: "1" } as const;
