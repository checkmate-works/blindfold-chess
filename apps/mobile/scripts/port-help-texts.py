"""Copy the practice modules' how-to-play and tutorial texts from the
web dictionary (apps/web/src/messages) into the mobile one, as
`moduleHelp.<mobileKey>.<page>.{title,body}`, and write the page order to
src/features/help/module-help-pages.ts.

Run from apps/mobile: `python3 scripts/port-help-texts.py`. Re-run after the
web texts change; the mobile keys are generated, not edited by hand.
"""
import json
import re
from pathlib import Path

WEB = Path("../web/src/messages")
MOBILE = Path("src/i18n/resources")
LOCALES = ["en", "ja", "es", "pt-BR"]

# mobile i18nKey -> web practice namespace
MODULES = {
    "coordinateQuiz": "coordinateQuiz",
    "legalMoves": "legalMoves",
    "boardSymmetry": "boardSymmetry",
    "squareColors": "squareColors",
    "diagonalQuiz": "diagonalQuiz",
    "routePlanner": "routePlanner",
    "quadrants": "quadrantAnchors",
    "knightTour": "knightTour",
    "algebraicNotation": "algebraicNotation",
    "fen": "fen",
    "positionMemory": "positionMemory",
}

# Tutorial steps that only make sense on the web page (they hand over to an
# interactive trial there).
SKIP_STEPS = {"start", "trial"}


def icu_to_i18next(text: str) -> str:
    return re.sub(r"\{(\w+)\}", r"{{\1}}", text)


# The web's how-to-play texts say "click"; the app has only a touch screen.
# (pattern, replacement) per locale, applied to every moduleHelp title and
# body. The Spanish "Pulsa" is already a touch word and stays.
TOUCH_WORDING = {
    "en": [(r"\bClick\b", "Tap"), (r"\bclick\b", "tap")],
    "ja": [(r"クリック", "タップ")],
    "es": [(r"\bHaz clic en\b", "Toca"), (r"\bhaz clic en\b", "toca")],
    "pt-BR": [(r"\bClique\b", "Toque"), (r"\bclique\b", "toque")],
}


def for_touch(text: str, locale: str) -> str:
    for pattern, replacement in TOUCH_WORDING[locale]:
        text = re.sub(pattern, replacement, text)
    return text


def pages_for(ns: dict) -> list[tuple[str, str, str]]:
    pages = []
    if "howToPlayTitle" in ns:
        pages.append(("howToPlay", ns["howToPlayTitle"], ns["howToPlayDescription"]))
    help_ = ns.get("help", {})
    if "overview" in help_:
        pages.append(("overview", help_["overview"]["title"], help_["overview"]["description"]))
    tutorial = ns.get("tutorial", {})
    for step, value in tutorial.get("steps", {}).items():
        if step in SKIP_STEPS:
            continue
        pages.append((f"step_{step}", value["title"], value["description"]))
    if not tutorial.get("steps") and isinstance(tutorial.get("description"), str):
        overview = help_.get("overview", {}).get("description")
        if tutorial["description"] != overview:
            pages.append(("tutorial", tutorial["title"], tutorial["description"]))
    if not pages:
        pages.append(("about", ns["title"], ns["description"]))
    # The web's challenge / training mode pages are left out: they say the
    # same thing for every module, and the setup screen already shows it —
    # the rules in the footer hint, recording in the sign-in row, and the
    # untimed mode in the Training button.
    return pages


order: dict[str, list[str]] = {}
for locale in LOCALES:
    web = json.loads((WEB / f"{locale}.json").read_text())["practice"]
    path = MOBILE / f"{locale}.json"
    mobile = json.loads(path.read_text())
    out = {}
    for key, web_key in MODULES.items():
        pages = pages_for(web[web_key])
        out[key] = {
            name: {
                "title": for_touch(icu_to_i18next(t), locale),
                "body": for_touch(icu_to_i18next(b), locale),
            }
            for name, t, b in pages
        }
        if locale == "en":
            order[key] = [name for name, _, _ in pages]
        else:
            assert [n for n, _, _ in pages] == order[key], (locale, key)
    mobile["moduleHelp"] = out
    path.write_text(json.dumps(mobile, ensure_ascii=False, indent=2) + "\n")




# --- Recall (感想戦): the strings the mobile screens use, under `recall.*`.
RECALL_KEYS = [
    "title", "description", "setup.pgnLabel",
    "autoOpponentMoves", "dontKnow", "dontKnowPrompt", "revealAnswer",
    "autoFillAll", "confirmAutoFillAllTitle", "confirmAutoFillAllMessage",
    "cancel", "logAutoFilled", "moves", "completed",
    "incorrectMoveError", "correctMoveMessage", "skippedMoveMessage",
    "summary.title", "summary.rateLabel", "summary.nailed", "summary.struggled",
    "summary.missed", "summary.mistakes", "summary.legendIncorrect",
    "summary.legendAuto", "summary.triedMove", "summary.autoFilledCount",
    "summary.reviewTitle", "summary.reviewHint",
    "summary.restart", "summary.startNew",
    "help.input.title", "help.input.description",
    "help.dontKnow.title", "help.dontKnow.description",
    "help.setup.color.title", "help.setup.color.description",
]

# The setup's colour picker and PGN box are shared parts on the web, with
# their texts in other namespaces; recall keeps its own copy under
# `recall.setup.color.*` / `recall.pgnInput.*`. (web namespace, key, mobile key)
RECALL_SHARED_KEYS = [
    ("newGame", "selectColor", "setup.color.title"),
    ("newGame", "playAsWhite", "setup.color.white"),
    ("newGame", "playAsBlack", "setup.color.black"),
    ("pgnInput", "placeholder", "pgnInput.placeholder"),
    ("pgnInput", "clear", "pgnInput.clear"),
    ("pgnInput", "clearConfirmTitle", "pgnInput.clearConfirmTitle"),
    ("pgnInput", "clearConfirmMessage", "pgnInput.clearConfirmMessage"),
    ("pgnInput", "clearConfirmButton", "pgnInput.clearConfirmButton"),
]


def dig(d, path):
    for part in path.split("."):
        d = d[part]
    return d


def plant(d, path, value):
    parts = path.split(".")
    for part in parts[:-1]:
        d = d.setdefault(part, {})
    d[parts[-1]] = value


for locale in LOCALES:
    web = json.loads((WEB / f"{locale}.json").read_text())["recall"]
    path = MOBILE / f"{locale}.json"
    mobile = json.loads(path.read_text())
    recall = mobile.setdefault("recall", {})
    for key in RECALL_KEYS:
        text = re.sub(r"</?b>", "", dig(web, key))
        plant(recall, key, icu_to_i18next(text))
    # The web's English reads "12... is not Nf3" (the move number "is not"
    # the move); the app names the move entered and says it is wrong.
    if locale == "en":
        recall["incorrectMoveError"] = "{{movePrefix}} {{move}} is incorrect"
    web_all = json.loads((WEB / f"{locale}.json").read_text())
    for ns, key, mobile_key in RECALL_SHARED_KEYS:
        plant(recall, mobile_key, icu_to_i18next(web_all[ns][key]))
    # The help sheet's pages for recall (the setup's PGN help mentions the
    # web-only Lichess import, so it is left out).
    mobile["moduleHelp"]["recall"] = {
        name: {
            "title": icu_to_i18next(web["help"][a]["title"] if b is None else web["help"][a][b]["title"]),
            "body": icu_to_i18next(web["help"][a]["description"] if b is None else web["help"][a][b]["description"]),
        }
        for name, a, b in [("input", "input", None), ("dontKnow", "dontKnow", None), ("color", "setup", "color")]
    }
    path.write_text(json.dumps(mobile, ensure_ascii=False, indent=2) + "\n")

order["recall"] = ["input", "dontKnow", "color"]
lines = [
    "// Generated by scripts/port-help-texts.py from the web dictionary. Do not edit.",
    "",
    "/** The help pages of each module, in the order the help sheet shows them. */",
    "export const MODULE_HELP_PAGES: Readonly<Record<string, readonly string[]>> = {",
]
for key, names in order.items():
    lines.append(f"  {key}: {json.dumps(names)},")
lines += ["};", ""]
out_ts = Path("src/features/help/module-help-pages.ts")
out_ts.parent.mkdir(parents=True, exist_ok=True)
out_ts.write_text("\n".join(lines))
print({k: len(v) for k, v in order.items()})


# --- Accounts: the sign-in, sign-up, verify-email and username texts, under
# `account.<web namespace>.*`, so the app says what the web says.
ACCOUNT_KEYS = {
    "signIn": ["title", "emailLabel", "emailPlaceholder", "passwordLabel",
               "passwordPlaceholder", "emailSignIn", "emailSignInError",
               "forgotPassword", "noAccount", "signUp", "rateLimited",
               "googleOAuth", "orDivider", "authError"],
    "signUp": ["title", "description", "emailLabel", "emailPlaceholder",
               "passwordLabel", "passwordPlaceholder", "confirmPasswordLabel",
               "confirmPasswordPlaceholder", "emailSignUp", "emailSignUpError",
               "passwordMismatch", "alreadyHaveAccount", "signIn", "rateLimited",
               "googleOAuth", "orDivider", "authError"],
    "verifyEmail": ["title", "description", "checkInbox", "checkSpam"],
    "setupUsername": ["title", "description", "usernameLabel",
                      "usernamePlaceholder", "usernameHint", "cannotChange",
                      "submit", "validation", "generateUsername"],
    "validation": ["password"],
}

for locale in LOCALES:
    web = json.loads((WEB / f"{locale}.json").read_text())
    path = MOBILE / f"{locale}.json"
    mobile = json.loads(path.read_text())
    account = mobile.setdefault("account", {})
    for ns, keys in ACCOUNT_KEYS.items():
        for key in keys:
            value = web[ns][key]
            if isinstance(value, dict):
                value = {k: icu_to_i18next(v) for k, v in value.items()}
            else:
                value = icu_to_i18next(value)
            account.setdefault(ns, {})[key] = value
    path.write_text(json.dumps(mobile, ensure_ascii=False, indent=2) + "\n")


# --- Puzzles: the web's `practice.puzzle` session / result / list texts, under
# `puzzle.*`.
#
# `result.title` is not ported: it is the result screen's header, and every
# practice module's result header in the app reads "Results" (`<module>.result.
# title`). The web's "Puzzle Result" names the module because a web page title
# stands alone in a tab; the app's header already sits over the puzzle.
PUZZLE_KEYS = {
    "session": ["correct", "incorrect", "showAnswer",
                "showBoard", "whitePlayed", "blackPlayed"],
    "result": ["replaySection", "historySection", "solution", "note",
               "backToList", "tryAgain",
               "peekCount", "statusSolved", "statusPartial", "statusRevealed",
               "likeCta", "likedCta"],
    "list": ["title", "empty"],
    "detail": ["descriptionSection", "startSolving", "whitePiecesLabel",
               "blackPiecesLabel", "noPieces"],
}
# The web's shared practice words the puzzle screens use, flat under puzzle.*.
PUZZLE_COMMON_KEYS = ["white", "black", "play", "replay"]

for locale in LOCALES:
    web = json.loads((WEB / f"{locale}.json").read_text())["practice"]["puzzle"]
    path = MOBILE / f"{locale}.json"
    mobile = json.loads(path.read_text())
    puzzle = mobile.setdefault("puzzle", {})
    for section, keys in PUZZLE_KEYS.items():
        for key in keys:
            puzzle.setdefault(section, {})[key] = icu_to_i18next(web[section][key])
    common = json.loads((WEB / f"{locale}.json").read_text())["practice"]["common"]
    for key in PUZZLE_COMMON_KEYS:
        puzzle[key] = icu_to_i18next(common[key])
    puzzle["title"] = web["title"]
    puzzle["description"] = web["description"]
    path.write_text(json.dumps(mobile, ensure_ascii=False, indent=2) + "\n")
