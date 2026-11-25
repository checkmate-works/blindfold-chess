/**
 * The learn articles on the two challenge pieces' movement, which the web
 * lists under its result page's "Related Learning". The app shows them on
 * the setup screen, as every module's setup does, and on the result screen.
 */
export const RELATED_ARTICLES = ["knight-movement", "bishop-movement"] as const;

/** The piece the web's card draws for each article. */
export const RELATED_ARTICLE_PIECES = {
  "knight-movement": "n",
  "bishop-movement": "b",
} as const;
