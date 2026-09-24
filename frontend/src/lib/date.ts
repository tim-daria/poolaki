/** @file Date constants and display formatting. */

export const TODAY = new Date().toISOString().slice(0, 10);

const CURRENT_YEAR = new Date().getFullYear();

/** Local-time parse: a bare ISO date would be read as UTC and shift a day west of Greenwich. */
function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** "5 Aug", with the year appended only when it is not the current one. */
export function shortDate(iso: string): string {
  const d = parseLocalDate(iso);
  const withYear = d.getFullYear() !== CURRENT_YEAR;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
  }).format(d);
}

/** "Dec 2026" — for deadlines, where the day is noise. Year always shown: a bare month is ambiguous. */
export function monthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(parseLocalDate(iso));
}
