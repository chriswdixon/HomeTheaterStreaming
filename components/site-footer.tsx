export function SiteFooter() {
  return (
    <footer className="glass-subtle mt-auto border-t border-white/10 px-4 py-6 text-center text-xs text-muted">
      Movie data from{" "}
      <a
        href="https://www.themoviedb.org/"
        className="text-foreground/80 underline-offset-2 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        TMDB
      </a>
      . Streaming availability from{" "}
      <a
        href="https://www.justwatch.com/"
        className="text-foreground/80 underline-offset-2 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        JustWatch
      </a>
      .
    </footer>
  );
}
