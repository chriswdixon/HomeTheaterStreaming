import type { StreamingOpenTarget } from "./streaming-links";

/** Opens the web watch URL in a new tab. Must run synchronously from a user gesture. */
export function openStreamingTarget(target: StreamingOpenTarget) {
  if (typeof window === "undefined") return;
  window.open(target.webUrl, "_blank", "noopener,noreferrer");
}
