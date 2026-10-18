/** @file Date constants and display formatting. */

/** Today in the browser's local zone, "YYYY-MM-DD". UTC would lag by a day until 02:00 in Berlin. */
export const TODAY = localIso(new Date());

/** The local calendar date of `d`, zero-padded, never shifted through UTC. */
function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

/** "July" inside the current year, "July 2025" otherwise: a list heading, like shortDate. */
export function monthHeading(iso: string): string {
  const d = parseLocalDate(iso);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    ...(d.getFullYear() !== CURRENT_YEAR && { year: "numeric" }),
  }).format(d);
}

/** "Saturday 17 October" (en-GB puts no comma): the Home greeting's line, in the app's one locale. */
export function longDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/** "August", for the month an ISO date falls in. */
export function monthName(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long" }).format(
    new Date(`${iso}T00:00:00`),
  );
}
