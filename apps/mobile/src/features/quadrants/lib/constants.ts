/**
 * The rules of a quadrants run, matching the web app's timed challenge for
 * this module: a fixed 60-second clock and a run that ends on the third
 * mistake. They are rules rather than settings, so the setup screen shows
 * them but does not let the player change them, and the session reads them
 * from here rather than from route params.
 */
export const QUADRANTS_TIME_LIMIT = 60;
export const QUADRANTS_MISTAKE_LIMIT = 3;
