/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewerAvailability } from "@/lib/availability";
import { MovieCard } from "./movie-card";

const availability: ViewerAvailability = {
  available: false,
  onServices: [],
  onRentServices: [],
  rentOffer: null,
  openTarget: null,
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

describe("MovieCard", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ details: { title: "Dune", trailers: [] } }),
      }),
    );
  });

  afterEach(() => {
    unmount(root, container);
    vi.unstubAllGlobals();
  });

  it("opens title details when the action overlay is clicked", () => {
    const mounted = render(
      <MovieCard
        tmdbMovieId={438631}
        title="Dune"
        year="2021"
        posterPath={null}
        overview="A desert planet."
        availability={availability}
        actions={<span>Add</span>}
      />,
    );
    root = mounted.root;
    container = mounted.container;

    const overlay = container.querySelector(".card-action-overlay");
    expect(overlay).not.toBeNull();

    act(() => {
      overlay!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector('[role="dialog"][aria-label="Dune"]')).not.toBeNull();
  });

  it("does not open title details when an overlay action is clicked", () => {
    const mounted = render(
      <MovieCard
        tmdbMovieId={438631}
        title="Dune"
        year="2021"
        posterPath={null}
        overview="A desert planet."
        availability={availability}
        actions={<button type="button">Add</button>}
      />,
    );
    root = mounted.root;
    container = mounted.container;

    const addButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Add",
    );
    expect(addButton).toBeDefined();

    act(() => {
      addButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector('[role="dialog"][aria-label="Dune"]')).toBeNull();
  });
});
