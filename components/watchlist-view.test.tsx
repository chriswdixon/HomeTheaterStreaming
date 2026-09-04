/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewerAvailability } from "@/lib/availability";
import { WatchlistView, type WatchlistItemView } from "./watchlist-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const availability: ViewerAvailability = {
  available: false,
  onServices: [],
  onRentServices: [],
  rentOffer: null,
  openTarget: null,
};

const item: WatchlistItemView = {
  id: "1",
  list: "personal",
  ownerUserId: "user-1",
  mediaType: "movie",
  tmdbMovieId: 603,
  title: "The Matrix",
  year: "1999",
  posterPath: null,
  overview: "A computer hacker.",
  genres: [],
  keywords: [],
  collectionId: null,
  collectionName: null,
  contentRating: null,
  folderName: null,
  folderOrder: null,
  sortOrder: 0,
  cachedFlatrateProviders: [],
  cachedRentProviders: [],
  watchUrl: null,
  addedByUserId: "user-1",
  availability,
  watchState: null,
};

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

function unmount(root: Root, container: HTMLDivElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

describe("WatchlistView backup actions", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    unmount(root, container);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows export and import on My List", () => {
    const mounted = render(
      <WatchlistView
        list="personal"
        title="My list"
        description="Your queue"
        initialItems={[item]}
        showSearch={false}
      />,
    );
    root = mounted.root;
    container = mounted.container;

    expect(container.querySelector("button")?.closest("div")?.textContent).toBeTruthy();
    const labels = [...container.querySelectorAll("button")].map(
      (button) => button.textContent,
    );
    expect(labels).toContain("Export");
    expect(labels).toContain("Import");
  });

  it("shows export and import on a shared list", () => {
    const mounted = render(
      <WatchlistView
        list="shared"
        title="Dixon family · Shared list"
        description="Vote"
        initialItems={[{ ...item, list: "shared", ownerUserId: null }]}
        showSearch={false}
        allowDrag={false}
        household={{
          name: "Dixon family",
          inviteCode: "ABCD1234",
          region: "US",
        }}
      />,
    );
    root = mounted.root;
    container = mounted.container;

    const labels = [...container.querySelectorAll("button")].map(
      (button) => button.textContent,
    );
    expect(labels).toContain("Export");
    expect(labels).toContain("Import");
  });

  it("downloads a v1 JSON backup of the full list", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:backup");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    const downloads: Array<{ href: string; download: string }> = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = () => {
          downloads.push({
            href: (element as HTMLAnchorElement).href,
            download: (element as HTMLAnchorElement).download,
          });
        };
      }
      return element;
    });

    const mounted = render(
      <WatchlistView
        list="personal"
        title="My list"
        description="Your queue"
        initialItems={[item]}
        showSearch={false}
        viewerServices={[
          { tmdbProviderId: 8, name: "Netflix", logoPath: "/netflix.png" },
        ]}
      />,
    );
    root = mounted.root;
    container = mounted.container;

    const exportButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Export",
    );
    act(() => {
      exportButton!.click();
    });

    expect(downloads[0]?.download).toMatch(/^my-list-\d{4}-\d{2}-\d{2}\.json$/);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const backup = JSON.parse(await blob.text());
    expect(backup).toMatchObject({
      format: "screenstack-list",
      version: 1,
      list: "personal",
      name: "My List",
      services: [
        { tmdbProviderId: 8, name: "Netflix", logoPath: "/netflix.png" },
      ],
      items: [
        {
          mediaType: "movie",
          tmdbMovieId: 603,
          title: "The Matrix",
          folderName: null,
        },
      ],
    });
    expect(backup.items[0]).not.toHaveProperty("id");
  });

  it("hides export and import on recently watched", () => {
    const mounted = render(
      <WatchlistView
        title="Recently watched"
        description="Rated titles"
        initialItems={[item]}
        showSearch={false}
        allowDrag={false}
        mode="watched"
      />,
    );
    root = mounted.root;
    container = mounted.container;

    const labels = [...container.querySelectorAll("button")].map(
      (button) => button.textContent,
    );
    expect(labels).not.toContain("Export");
    expect(labels).not.toContain("Import");
  });
});
