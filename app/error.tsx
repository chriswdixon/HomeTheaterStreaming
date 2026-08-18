"use client";

export default function ErrorPage({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const tryAgain = retry ?? reset;
  const hiddenServerError =
    Boolean(error.digest) || error.message.includes("Minified React error");

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-muted">
        {hiddenServerError
          ? "Please try again in a moment. Streaming availability data is sometimes rate-limited."
          : error.message ||
            "Please try again. Check that Clerk, Neon, and TMDB keys are set."}
      </p>
      <button
        type="button"
        onClick={() => tryAgain?.()}
        className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-medium text-black"
      >
        Try again
      </button>
    </div>
  );
}
