export type LinkSegment =
  | { type: "text"; value: string }
  | { type: "link"; href: string; display: string; isExternal: boolean };

const DANGEROUS_SCHEMES = /^(javascript|data|vbscript|file):/i;

const URL_REGEX =
  /https?:\/\/[^\s<>"'\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF60]+/gi;

const TRAILING_PUNCT = /[)}\].,;:!?]+$/;

export function isInternalUrl(href: string, siteDomain: string): boolean {
  try {
    const url = new URL(href);
    const hostname = url.hostname.toLowerCase();
    return hostname === siteDomain || hostname === `www.${siteDomain}`;
  } catch {
    return false;
  }
}

export function isDangerousUrl(href: string): boolean {
  return DANGEROUS_SCHEMES.test(href.trim());
}

export function linkifyText(text: string, siteDomain: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    let href = match[0];

    // Strip trailing punctuation that is likely not part of the URL
    href = href.replace(TRAILING_PUNCT, "");

    if (isDangerousUrl(href)) {
      continue;
    }

    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    const isExternal = !isInternalUrl(href, siteDomain);

    segments.push({
      type: "link",
      href,
      display: href,
      isExternal,
    });

    lastIndex = match.index + href.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function buildCushionPageUrl(
  externalUrl: string,
  locale: string,
): string {
  return `/${locale}/redirect?url=${encodeURIComponent(externalUrl)}`;
}
