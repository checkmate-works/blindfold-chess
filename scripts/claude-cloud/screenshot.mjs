// Screenshot pages of the local app from a Claude Code cloud session.
// Invoked through screenshot.sh, which supplies the browser, playwright-core
// and the repository values from config.sh as environment variables; see that
// file for usage.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { parseArgs } from "node:util";

const require = createRequire(
  join(process.env.PW_PREFIX, "node_modules", "x.js"),
);
const { chromium } = require("playwright-core");

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};

const env = (name, fallback = "") => process.env[name] || fallback;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    viewport: { type: "string", default: "both" },
    login: { type: "string" },
    full: { type: "boolean", default: false },
    "show-consent": { type: "boolean", default: false },
    out: { type: "string", default: "/tmp/claude-cloud/shots" },
  },
});

if (positionals.length === 0) {
  console.error(
    "usage: screenshot.sh <path> [<path> ...] [--viewport desktop|mobile|both] [--login <user>] [--full] [--show-consent]",
  );
  process.exit(2);
}

const base = env("APP_URL", "http://localhost:3000");
const viewports =
  values.viewport === "both" ? ["desktop", "mobile"] : [values.viewport];
for (const v of viewports) {
  if (!VIEWPORTS[v]) throw new Error(`unknown viewport: ${v}`);
}
mkdirSync(values.out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME });
const stamp = new Date().toISOString().slice(11, 19).replaceAll(":", "");

for (const v of viewports) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[v],
    locale: env("LOCALE", "ja-JP"),
  });
  // A stored consent decision keeps the cookie banner from covering the
  // bottom of every screenshot; --show-consent leaves it in place. Apps
  // without a banner leave CONSENT_COOKIE_NAME empty.
  const consentCookie = env("CONSENT_COOKIE_NAME");
  if (consentCookie && !values["show-consent"]) {
    await context.addCookies([
      { name: consentCookie, value: env("CONSENT_COOKIE_VALUE"), url: base },
    ]);
  }
  const page = await context.newPage();

  if (values.login) {
    const email = values.login.includes("@")
      ? values.login
      : `${values.login}@${env("SEED_EMAIL_DOMAIN", "example.local")}`;
    const loginPath = env("LOGIN_PATH", "/sign-in");
    const done = env("LOGIN_DONE_EXCLUDES", loginPath);
    await page.goto(`${base}${loginPath}`, { waitUntil: "networkidle" });
    await page.fill(env("LOGIN_EMAIL_SELECTOR", "#email"), email);
    await page.fill(env("LOGIN_PASSWORD_SELECTOR", "#password"), env("SEED_PASSWORD"));
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes(done), {
        timeout: 30_000,
      }),
      page.click(env("LOGIN_SUBMIT_SELECTOR", 'form button[type="submit"]')),
    ]);
    console.log(`signed in as ${email}`);
  }

  for (const path of positionals) {
    const res = await page.goto(base + path, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    // The Next.js dev-mode badge overlaps bottom-left content and never
    // appears in production.
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    const slug =
      path.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "_") || "root";
    const file = join(values.out, `${stamp}-${slug}-${v}.png`);
    await page.screenshot({ path: file, fullPage: values.full });
    console.log(`${res?.status() ?? "???"} ${path} [${v}] -> ${file}`);
  }
  await context.close();
}

await browser.close();
