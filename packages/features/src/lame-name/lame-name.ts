/**
 * Profanity filter ported from Lichess's LameName.scala.
 * Detects banned words with leetspeak/obfuscation resilience.
 */

const baseWords = [
  "1488",
  "8814",
  "administrator",
  "asshole",
  "bastard",
  "biden",
  "bitch",
  "butthole",
  "buttsex",
  "cancer",
  "cheat",
  "coon",
  "cuck",
  "cunniling",
  "cunt",
  "cyka",
  "douche",
  "fag",
  "fart",
  "feces",
  "fuck",
  "golam",
  "hitler",
  "idiot",
  "jerk",
  "kanker",
  "kunt",
  "moderator",
  "mongool",
  "nazi",
  "nigg",
  "pedo",
  "penis",
  "pidar",
  "pidr",
  "piss",
  "poon",
  "poop",
  "poxyu",
  "pussy",
  "putin",
  "resign",
  "retard",
  "slut",
  "suicid",
  "trump",
  "vagin",
  "wanker",
  "whore",
  "xyula",
  "xyulo",
  "xyuta",
];

const extras: Record<string, string> = {
  a: "4",
  e: "38",
  g: "q9",
  i: "l1",
  l: "I1",
  o: "08",
  s: "5",
  u: "v",
  z: "2",
};

function buildSubstitutionMap(): Record<string, string> {
  const subs: Record<string, string> = {};

  for (let code = 97; code <= 122; code++) {
    const c = String.fromCharCode(code);
    const upper = c.toUpperCase();
    const extra = extras[c] ?? "";
    subs[c] = `[${c}${upper}${extra}]`;
  }

  subs["0"] = "[0O]";
  subs["1"] = "[1Il]";
  subs["8"] = "[8B]";

  return subs;
}

const subs = buildSubstitutionMap();

const lameRegex = new RegExp(
  baseWords
    .map((word) =>
      Array.from(word)
        .map((ch) => `${subs[ch] ?? ch}+`)
        .join(""),
    )
    .join("|"),
);

/**
 * Normalize a name for matching: lowercase, strip underscores, spaces, hyphens,
 * and other non-alphanumeric characters.
 */
function simplify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Returns true if the name contains a banned word pattern.
 */
export function isLameName(name: string): boolean {
  return lameRegex.test(simplify(name));
}
