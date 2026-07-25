/**
 * Minimum number of games a list must hold before the mid-page
 * (`content-middle`) ad is shown above the sort control. Below this the list
 * is short enough that `content-bottom` is already near the fold, so a second
 * ad would only crowd the page. Shared by the "mine" tab (client, localStorage
 * count) and the shared-games list (server, `totalCount`) so the threshold
 * stays in sync.
 */
export const MIN_GAMES_FOR_MID_AD = 5;
