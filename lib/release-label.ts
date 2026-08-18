export function releaseYearFromDate(
  releaseDate: string | null | undefined,
  now = new Date(),
): string | null {
  if (!releaseDate || releaseDate.length < 4) return null;

  const parsed = new Date(releaseDate);
  if (!Number.isNaN(parsed.getTime())) {
    if (parsed > now) return null;
    return releaseDate.slice(0, 4);
  }

  const year = releaseDate.slice(0, 4);
  const yearNum = Number.parseInt(year, 10);
  if (Number.isNaN(yearNum) || yearNum > now.getFullYear()) return null;
  return year;
}

export function formatReleaseLabel(
  year: string | null | undefined,
  now = new Date(),
): string {
  if (!year) return "Unreleased";

  const yearNum = Number.parseInt(year, 10);
  if (Number.isNaN(yearNum) || yearNum > now.getFullYear()) {
    return "Unreleased";
  }

  return year;
}
