import type { StreamingOpenTarget } from "./streaming-links";

export function openStreamingTarget(target: StreamingOpenTarget) {
  if (typeof window === "undefined") return;

  if (target.appUrl === target.webUrl) {
    window.open(target.webUrl, "_blank", "noopener,noreferrer");
    return;
  }

  let fallbackOpened = false;
  const fallbackMs = 1200;

  const openWebFallback = () => {
    if (fallbackOpened) return;
    fallbackOpened = true;
    window.open(target.webUrl, "_blank", "noopener,noreferrer");
    cleanup();
  };

  const timer = window.setTimeout(openWebFallback, fallbackMs);

  const cleanup = () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onBlur);
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      fallbackOpened = true;
      cleanup();
    }
  };

  const onBlur = () => {
    fallbackOpened = true;
    cleanup();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onBlur);
  window.location.assign(target.appUrl);
}
