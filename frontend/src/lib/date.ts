/** @file Date constants and display formatting. */

export const TODAY = new Date().toISOString().slice(0, 10);

const CURRENT_YEAR = new Date().getFullYear();

/** "5 Aug", with the year appended only when it is not the current one. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const withYear = d.getFullYear() !== CURRENT_YEAR;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear && { year: "numeric" }),
  }).format(d);
}
