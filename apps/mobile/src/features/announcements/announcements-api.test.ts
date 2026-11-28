import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/api-client", () => ({
  callMobileApi: vi.fn(),
}));

import { callMobileApi } from "../../auth/api-client";
import { fetchAnnouncement, fetchAnnouncementPage } from "./announcements-api";

const api = vi.mocked(callMobileApi);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** What a captive portal answers with: a 200 that is not JSON. */
const portalPage = () =>
  new Response("<html><body>Sign in to the Wi-Fi</body></html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });

const summary = {
  slug: "app-release",
  title: "The app is out",
  publishedAt: "2026-11-28T00:00:00.000Z",
  pinned: true,
};

beforeEach(() => {
  api.mockReset();
});

describe("fetchAnnouncementPage", () => {
  it("asks for the page in the app's language without a token", async () => {
    api.mockResolvedValue(json({ items: [], page: 2, totalPages: 2 }));
    await fetchAnnouncementPage(2, "pt-BR");
    expect(api).toHaveBeenCalledWith("/announcements?page=2&locale=pt-BR", {
      anonymous: true,
    });
  });

  it("keeps well-formed items and drops the rest", async () => {
    api.mockResolvedValue(
      json({
        items: [summary, { ...summary, slug: "x", pinned: "yes" }],
        page: 1,
        totalPages: 1,
      }),
    );
    await expect(fetchAnnouncementPage(1, "en")).resolves.toEqual({
      items: [summary],
      page: 1,
      totalPages: 1,
    });
  });

  it("resolves to failed, not a rejection, when a 2xx body is not JSON", async () => {
    api.mockResolvedValue(portalPage());
    await expect(fetchAnnouncementPage(1, "en")).resolves.toBe("failed");
  });

  it("resolves to failed without page numbers, offline, or on a non-2xx", async () => {
    api.mockResolvedValue(json({ items: [] }));
    await expect(fetchAnnouncementPage(1, "en")).resolves.toBe("failed");
    api.mockResolvedValue("offline");
    await expect(fetchAnnouncementPage(1, "en")).resolves.toBe("failed");
    api.mockResolvedValue(json({ error: "temporarilyUnavailable" }, 503));
    await expect(fetchAnnouncementPage(1, "en")).resolves.toBe("failed");
  });
});

describe("fetchAnnouncement", () => {
  const announcement = {
    slug: "app-release",
    title: "The app is out",
    content: "# Hello",
    publishedAt: "2026-11-28T00:00:00.000Z",
  };

  it("returns a well-formed announcement, the slug encoded", async () => {
    api.mockResolvedValue(json(announcement));
    await expect(fetchAnnouncement("a b", "ja")).resolves.toEqual(announcement);
    expect(api).toHaveBeenCalledWith("/announcements/a%20b?locale=ja", {
      anonymous: true,
    });
  });

  it("tells a 404 apart from a failure", async () => {
    api.mockResolvedValue(json({ error: "notFound" }, 404));
    await expect(fetchAnnouncement("gone", "en")).resolves.toBe("notFound");
    api.mockResolvedValue(json({ ...announcement, content: null }));
    await expect(fetchAnnouncement("bad", "en")).resolves.toBe("failed");
    api.mockResolvedValue(portalPage());
    await expect(fetchAnnouncement("portal", "en")).resolves.toBe("failed");
  });
});
