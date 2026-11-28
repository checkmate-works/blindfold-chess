import { callMobileApi } from "../../auth/api-client";

export type AnnouncementSummary = {
  slug: string;
  title: string;
  /** ISO 8601. */
  publishedAt: string;
  pinned: boolean;
};

export type AnnouncementPage = {
  items: AnnouncementSummary[];
  /** The page the server returned, 1-based. */
  page: number;
  totalPages: number;
};

export type Announcement = {
  slug: string;
  title: string;
  /** Markdown, rendered with the learn articles' `MarkdownView`. */
  content: string;
  publishedAt: string;
};

// As in `puzzles-api.ts`, a 2xx is not proof of a JSON body from our API (a
// captive portal can answer with an HTML page and a 200), so every body is
// read with `json().catch(() => undefined)` and checked for the fields the
// screens use; anything else becomes "failed" instead of a rejection.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSummary(v: unknown): v is AnnouncementSummary {
  return (
    isRecord(v) &&
    typeof v.slug === "string" &&
    typeof v.title === "string" &&
    typeof v.publishedAt === "string" &&
    typeof v.pinned === "boolean"
  );
}

function isAnnouncement(v: unknown): v is Announcement {
  return (
    isRecord(v) &&
    typeof v.slug === "string" &&
    typeof v.title === "string" &&
    typeof v.content === "string" &&
    typeof v.publishedAt === "string"
  );
}

/**
 * One page of the public announcements (`GET /announcements`, public),
 * pinned first then newest first, in `locale` where a translation exists.
 *
 * Never rejects. "failed" covers a request that did not reach the server, a
 * non-2xx, and a 2xx whose body lacks the page numbers or the item list.
 * Items missing a field are dropped rather than failing the whole page.
 */
export async function fetchAnnouncementPage(
  page: number,
  locale: string,
): Promise<AnnouncementPage | "failed"> {
  const query = `page=${page}&locale=${encodeURIComponent(locale)}`;
  const response = await callMobileApi(`/announcements?${query}`, {
    anonymous: true,
  });
  if (typeof response === "string" || !response.ok) return "failed";
  const body: unknown = await response.json().catch(() => undefined);
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    typeof body.page !== "number" ||
    typeof body.totalPages !== "number"
  ) {
    return "failed";
  }
  return {
    items: body.items.filter(isSummary),
    page: body.page,
    totalPages: body.totalPages,
  };
}

/**
 * One public announcement with its body; "notFound" when the slug has no
 * public published one (taken down since the list was read, or members-only,
 * which the app does not show).
 *
 * Never rejects. "failed" covers no response, a non-2xx other than 404, and a
 * 2xx whose body lacks a field the screen reads.
 */
export async function fetchAnnouncement(
  slug: string,
  locale: string,
): Promise<Announcement | "notFound" | "failed"> {
  const response = await callMobileApi(
    `/announcements/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    { anonymous: true },
  );
  if (typeof response === "string") return "failed";
  if (response.status === 404) return "notFound";
  if (!response.ok) return "failed";
  const body: unknown = await response.json().catch(() => undefined);
  return isAnnouncement(body) ? body : "failed";
}

/** The announcement's publication date in the app's language ("Nov 28, 2026"). */
export function formatAnnouncementDate(iso: string, language: string): string {
  return new Date(iso).toLocaleDateString(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
