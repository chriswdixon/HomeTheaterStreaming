"use client";

import { useEffect, useState } from "react";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 320);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const buttonClass = `flex items-center justify-center rounded-full glass text-accent transition hover:scale-105 ${
    visible ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  return (
    <>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`pointer-events-auto fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 h-11 w-11 md:hidden ${buttonClass}`}
      >
        <ArrowUpIcon className="h-5 w-5" />
      </button>
      <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center px-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className={`pointer-events-auto ml-auto flex h-12 w-12 translate-x-[calc(100%+0.75rem)] ${buttonClass}`}
          >
            <ArrowUpIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
